import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

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

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )


} )

export {registerUser};
// 1	Get user details from frontend.
// 2	Validation- if empty
// 3	Check if user already exists (using email or username)
// 4	Check for images and avatar
// 5	Upload them to cloudinary (image , avatar)
// 6	Create user object (create entry in db)
// 7	Remove password and refresh token field from response
// 8	Check for user creation
// 9	Return response to frontend
