import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { application } from "express"
import  jwt  from "jsonwebtoken"

const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken= await user.generateAccessToken()
        const refreshToken= await user.generateRefreshToken()
        user.refreshToken= refreshToken;
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500,"something went wrong while genarating access and refresh token")
    }
} 


const registerUser = asyncHandler( async(req,res)=>{
    const {fullName,email,userName,password} = req.body;  // 1
    //console.log("email: ",email);

    if( [fullName,email,userName,password].some((field)=>field?.trim()==="") )   // 2
        { return new ApiError(400,"all fields are required") }
    
    const existedUser = await User.findOne({ $or: [{userName},{email}]  })    //3
    if(existedUser){ throw new ApiError(400,"user with username or email already exists"); }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
    
    const user= await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",                      // 6
        email,
        password,
        userName: userName.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select("-password -refreshToken")  // 7

    if(!createdUser){throw new ApiError(500,"something went wrong while registering")}       // 8

    return res.status(201).json(    new ApiResponse(200,createdUser,"User registered successfully")    );
} )
// 1	Get user details from frontend.
// 2	Validation- if empty
// 3	Check if user already exists (using email or username)
// 4	Check for images and avatar
// 5	Upload them to cloudinary (image , avatar)
// 6	Create user object (create entry in db)
// 7	Remove password and refresh token field from response
// 8	Check for user creation
// 9	Return response to frontend


const  loginUser = asyncHandler(async(req,res)=>{

const {email, userName , password} = req.body;

if(!userName && !password){
    throw new ApiError(400, "userName or email is required");
}

const user = await User.findOne({
    $or: [{userName},{email}]
})

if(!user){
    throw new ApiError(404,"user does not exist")
}

const isPasswordValid = await user.isPasswordCorrect(password);
if(!isPasswordValid){throw new ApiError(401, "Password not valid")}

const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

const options={
    httpOnly: true,
    secure: true
}

return res
.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options)
.json(
    new ApiResponse(
        200,{
            user: loggedInUser, accessToken, refreshToken
        },
        "User logged in successfully"
    )
)
})
//1	Extract data from request body
//2	Choose username or email based login
//3	Find the user
//4	Check the password
//5	Generate access and refresh token
//6	Send the tokens in cookies


const logoutUser= asyncHandler( async(req,res)=>{

    await User.findByIdAndUpdate(
    req.user._id,
    {
        $set: {
            refreshToken: undefined
        }
    },
    {
        new: true
    }
     )


    const options={
        httpOnly: true,
        secure: true
            }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json( new ApiResponse(200,{},"User logged out"))       
 
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized access");
    }
   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
     user= await User.findById(decodedToken?._id)
     if(!user){throw new ApiError(401,"Invalid refresh token")}
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh token is invalid or used")
     }
 
     const options={httpOnly: true, secure:true}
     const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id)
 
     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",newRefreshToken,options)
     .json(new ApiResponse(200,{accessToken,refreshToken:newRefreshToken}, "access token refreshed successfully"))
   } 
   catch (error) {
        throw new ApiError(401,error?.message|| "Invalid refresh Token")
   }
})

export {loginUser,logoutUser,registerUser,refreshAccessToken};

