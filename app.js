// Declaring
const express    = require("express");
const multer     = require("multer");
const app        = express();
const fs         = require("fs");
const pdf        = require("pdfkit");
var Tesseract    = require("tesseract.js");
var mongoose     = require('mongoose');
var passport     = require('passport');
var bodyParser   = require('body-parser');
var User         = require('./models/user');
const user       = require("./models/user");
var flash        = require('connect-flash');
const session    = require('express-session');
var localStrategy  = require("passport-local");
var passportLocalMongoose =  require('passport-local-mongoose');


//db config
const db = require('./config/keys').MongoURI;

//mongo connect
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology:true})
.then(()=>console.log('MongoDB connected...'))
.catch(err=>console.log(err));

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(flash());

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'i am aman',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(express.json());

//Flash Cards
app.use(function(req, res, next){
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

//Uploading

var Storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, __dirname + "/images");
  },
  filename: (req, file, callback) => {
    callback(null, file.originalname);
  }
});

var upload = multer({
  storage: Storage,
  fileFilter: function(req, file, cb) {
    checkfiletype(file, cb);
  }
}).single("image");

//checkfiletype function
function checkfiletype(file, cb) {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(file.originalname);

  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(" Error : Images Only !");
  }
}

//Routes

app.get("/", (req, res) => {
  res.render("landing");
});

app.get("/home" ,isLoggedIn, (req, res) => {
  res.render("index");
});


app.get("/register", (req, res) => {
  res.render("register");
});

//handling user signup
app.post("/register",(req,res) => {
  req.body.firstname
  req.body.lastname
  req.body.username
  req.body.password
  User.register(new User({firstname: req.body.firstname, lastname: req.body.lastname,username: req.body.username }),req.body.password,
  (err,user)=> {
    if(err){
      console.log(err);
      req.flash("error", "User Already Exists!");
      return res.render("register");
    }
    passport.authenticate("local")(req, res, function () {
      req.flash("success", "You are now Registered Successfully!!");
      res.redirect("/home");
    })
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

//login logic
app.post("/login",passport.authenticate("local", {
  successRedirect: "/home",
  failureRedirect: "/login"
}), (req, res) => {
    
})

app.get("/logout", (req,res)=>{
  req.logout();
  req.flash("success", "Log Out Successful!!");
  res.redirect("/");
})


app.get("/contact", isLoggedIn, (req, res) => {
  res.render("contact");
});

app.post("/contact", isLoggedIn, (req, res) => { 
  req.flash("success", "Feedback Submitted Successfully!");
  res.redirect("/contact");
});

app.post("/upload",isLoggedIn, (req, res) => {
  console.log(req.file);
  upload(req, res, err => {
    if (err) {
      req.flash("error", err);
      res.redirect("/home");
    } else {
      if (req.file == undefined) {
        req.flash("error", "Image Not Selected!");
        res.redirect("/home");
      } else {
        console.log(req.file);
        var image = fs.readFileSync(
          __dirname + "/images/" + req.file.originalname,
          {
            encoding: null
          }
        );
        Tesseract.recognize(image,'eng',
          { logger: m => console.log(m) }
        ).then(({ data: { text } }) => {
          res.render("display", {
            data: text,
            path: __dirname + "/images/" + req.file.originalname
          });

            var myDoc = new pdf();
            myDoc.pipe(
              fs.createWriteStream(`./pdfs/${req.file.originalname}.pdf`)
            );
            myDoc
              .font("Times-Roman")
              .fontSize(24)
            .text(`${text}`, 100, 100);
          myDoc.end();
          req.session.fname = req.file.originalname;
          req.session.save();
          });
      }
    }
  });
});

app.get("/download", (req, res) => {
  const File = req.session.fname;
  const file = `./pdfs/${File}.pdf`;
  res.download(file);

});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/showdata", (req, res) => { });


//Middleware
function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  req.flash("error", "You need to Login First!!");
  res.redirect("/login");
}

//Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});
