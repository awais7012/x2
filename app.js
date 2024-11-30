const express = require('express');
const userModel = require('./models/user'); 
const postModel = require('./models/posts'); 
const cookieParser = require('cookie-parser');
const path = require('path')
const bcrypt = require('bcrypt');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const fs = require("fs");
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
// const multerConfig = require('./config/multer')

const app = express();
const PORT = 3000;

// MongoDB connection
const mongoURI = 'mongodb://localhost:27017/databaseX'; 

const connectDB = async () => {
    try {
        // Check if already connected
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoURI);
            console.log('MongoDB connected');
        }
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

connectDB();

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads\images', // Specify the folder name in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    },
});

// const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: {
//       folder: 'posts', // The folder where uploads will be stored in Cloudinary
//       allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
//     },
//   });
  
  const upload = multer({ storage });
  


// Middleware setup
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"uploads")))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// n   key
const  secretKey = 'romeo'

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         const uploadPath = path.join(__dirname, 'uploads/images');
//         cb(null, uploadPath);
//     },
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + '-' + file.originalname); // Use a unique name for each file
//     }
// });

// // Initialize multer with storage
// const upload = multer({ storage });






// Authentication middleware
function islogged(req, res, next) {
    if (!req.cookies.token) {
        return res.redirect('/login');
    }
    try {
        const data = jwt.verify(req.cookies.token, secretKey);
        req.user = data;
        next();
    } catch (err) {
        return res.status(403).send("Invalid token");
    }
}

// Routes
app.get('/romeo', (req, res) => {
    res.render("index"); 
});

app.get('/login', (req, res) => {
    res.render("login"); 
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userModel.findOne({ email });
        if (!user) return res.status(400).send("Invalid credentials");

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            let token = jwt.sign({ email: email, userId: user._id, username: user.username }, secretKey);
            res.cookie("token", token);
            return res.redirect(`/main/${user.username}`);
        } else {
            return res.status(400).send("Invalid credentials");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// Profile GET route
app.get('/profile', islogged, (req, res) => {
    const content = req.body.content || '';  // Assuming content is part of the body, if available
    const token = req.cookies.token;
    const verify = jwt.verify(token, secretKey);
    const loggedInUser = verify.username;
    res.redirect(`/profile/${loggedInUser}`); // Redirect without content for now
});

// const multer = require('multer');
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const cloudinary = require('cloudinary').v2;

// Configure Cloudinary


// Configure Multer with Cloudinary storage


// const upload = multer({ storage });

// Updated Route
// const multer = require('multer');

// Configure multer for file uploads
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/uploads/images'); // Folder to save images
//     },
//     filename: (req, file, cb) => {
//         cb(null, `${Date.now()}-${file.originalname}`);
//     },
// });

// const upload = multer({ storage });

app.post('/profile', islogged, upload.single('image'), async (req, res) => {
    try {
        const token = req.cookies.token;
        const verify = jwt.verify(token, secretKey);
        const loggedInUser = verify.username;

        const user = await userModel.findOne({ username: loggedInUser });
        const content = req.body.content;

        // Create the post object
        const postData = {
            user: user._id,
            content,
        };

        // Check if an image was uploaded
        if (req.file) {
            postData.image = `/uploads/images/${req.file.filename}`;
        }

        // Save the post
        const post = await postModel.create(postData);

        // Add the post to user's posts array
        user.posts.push(post._id);
        await user.save();

        // Fetch all posts of the user
        const allPosts = await postModel.find({ user: user._id }).populate('user');

        // Render the profile page with updated posts
        res.render('main', { loggedInUser, allPosts, user });
    } catch (err) {
        console.error("Error in /profile POST:", err);
        res.status(500).send("Internal Server Error");
    }
});




// Profile GET route with username
app.get('/profile/:username', islogged, async (req, res) => {
    const content = req.body.content; // If this is how you are sending content
    const usernameInUrl = req.params.username;
    const token = req.cookies.token;

    try {
        const verify = jwt.verify(token, secretKey);
        const loggedInUser = verify.username;

        const user = await userModel.findOne({ username: usernameInUrl }).populate('posts');
        if (!user) {
            return res.status(404).send("Username not found");
        }
        const allPosts = await postModel.find({ user: user._id }).populate('user');
        if (usernameInUrl === loggedInUser) {
            res.render('profile', { user, loggedInUser, content,allPosts });
        } else {
            res.status(403).send("You are not authorized to view this profile");
        }
    } catch (err) {
        console.error(err);
        res.status(403).send("Invalid or expired token, please log in again");
    }
});



app.get('/main', islogged, async (req, res) => {
    const token = req.cookies.token;
    try {
        const verify = jwt.verify(token, secretKey);
        let users = await userModel.find();
        const loggedInUser = verify.username; 
        console.log(users);
        const allPosts = await postModel.find({ user: loggedInUser._id }).populate('user');
        res.render('main', { loggedInUser, allPosts, users });
    } catch (err) {
        console.error("Error in /main route:", err);
        res.status(500).send("Internal Server Error");
    }
});





// Profile POST route (for post creation)
app.post('/profile', islogged,  async (req, res) => {
    try {
        const token = req.cookies.token;
        const verify = jwt.verify(token, secretKey);
        const loggedInUser = verify.username;

        const user = await userModel.findOne({ username: loggedInUser });
        const { content } = req.body;

        console.log('Uploaded file:', req.file); // Check if the file is being uploaded correctly

        const post = await postModel.create({
            user: user._id,
            content,
            images: req.file ? [`/uploads/images/${req.file.filename}`] : []
        });

        user.posts.push(post._id);
        await user.save();
        const allPosts = await postModel.find({ user: user._id }).populate('user');
        console.log('Post created:', post);  // Verify the post is created correctly

        // res.redirect(`/main/${loggedInUser}`);
        res.render('main', { loggedInUser, allPosts, user });
    } catch (err) {
        console.error("Error in /profile POST:", err);
        res.status(500).send("Internal Server Error");
    }
});

// Main GET route


    // const token = req.cookies.token;
    // try {
    //     const verify = jwt.verify(token, secretKey);
    //     let users = await userModel.find();
    //     const loggedInUser = verify.username; 
    //     console.log(users)
    //     const allPosts = await postModel.find().populate('user');
    //     res.render('main', { loggedInUser, allPosts,users });
    // } catch (err) {
    //     return err;
    //     }

// Main GET route






// Main GET route for specific username
app.get('/main/:username', islogged, async (req, res) => {
    const { username } = req.params; // Get the username from the URL params
    const token = req.cookies.token;

    try {
        const verify = jwt.verify(token, secretKey);
        const loggedInUser = verify.username;

        // Find all posts for the specific user
        const user = await userModel.findOne({ username }).populate('posts');
        let users = await userModel.find(); 
        if (!user) {
            return res.status(404).send("Username not found");
        }

        // Render the main page for the specific user
        const allPosts = await postModel.find({ user: user._id }).populate('user');
        res.render('main', { loggedInUser, allPosts,users });
    } catch (err) {
        return res.status(403).send("Invalid token or user not found");
    }
});


app.get('/search-users', islogged, async (req, res) => {
    const { query } = req.query; // Get the search query from the URL
    try {
        const users = await userModel.find({ username: { $regex: query, $options: 'i' } }); // Case insensitive search
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});





// Logout route
app.get('/logout', (req, res) => {
    res.cookie('token', "", { expires: new Date(0) });
    res.send("You are logged out");
});

// Registration route
// ... existing code ...

// Add multer setup at the top of your file with other requires

// ... existing code ...

// Updated registration route with file upload handling
app.post('/register', async (req, res) => {
    const { email, password, age, name, userName } = req.body;

    try {
        // Check if email already exists
        const existingEmail = await userModel.findOne({ email });
        if (existingEmail) {
            return res.status(400).send("Email is already registered");
        }

        // Check if username already exists
        const existingUsername = await userModel.findOne({ username: userName });
        if (existingUsername) {
            return res.status(400).send("Username is already taken");
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Prepare user data
        const userData = {
            name,
            username: userName,
            email,
            age,
            password: hashedPassword,
        };

        // Save user to the database
        const newUser = await userModel.create(userData);

        // Generate JWT token
        const token = jwt.sign(
            { email: newUser.email, userId: newUser._id, username: userName },
            secretKey
        );

        // Send the token as a cookie
        res.cookie("token", token, { httpOnly: true });

        // Redirect to main page after successful registration
        res.redirect('/main'); // Redirect to the '/main' route

    } catch (err) {
        console.error("Error in registration:", err.message);
        res.status(500).send("Internal Server Error");
    }
});






// ... existing code ...

// Server listener
app.listen(PORT, (err) => {
    if (err) {
        console.error(`Error: ${err}`);
    }
    console.log(`Server started on port ${PORT}`);
});
