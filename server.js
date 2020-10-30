// Declaring
const express = require("express");
const multer = require("multer");
const app = express();
const fs = require("fs");
const pdf = require("pdfkit");
var Tesseract = require("tesseract.js");
var mongoose=require('mongoose');
var passport = require('passport');
var bodyParser = require('body-parser');
var User = require('./models/user');
var localStrategy = require("passport-local");
var passportLocalMongoose=  require('passport-local-mongoose');
const user = require("./models/user");

//db config
const db = require('./config/keys').MongoURI;

//mongo connect
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology:true})
.then(()=>console.log('MongoDB connected...'))
.catch(err=>console.log(err));

//middlewares
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.urlencoded({ extended: true }));
app.use(require('express-session')({
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

const PORT = process.env.PORT | 5000;

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

//route
app.get("/", (req, res) => {
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
      return res.render("register");
    }
    passport.authenticate("local")(req,res, function(){
      res.redirect("/");
    })
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

//login logic
//middleware
app.post("/login",passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login"
}) , (req,res)=> {
})

app.get("/logout", (req,res)=>{
  req.logout();
  res.redirect("/about");
})
//middleware 
function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect("/login");
}


app.get("/contact", (req, res) => {
  res.render("contact");
});

app.post("/upload", (req, res) => {
  console.log(req.file);
  upload(req, res, err => {
    if (err) {
      res.render("index", { msg: err });
    } else {
      if (req.file == undefined) {
        res.render("index", {
          msg: " Image not Selected !"
        });
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
            const downloadpath =
              __dirname + "/pdfs/" + req.file.originalname.pdf;
            app.get("/download", (req, res) => {
              const file = `./pdfs/${req.file.originalname}.pdf`;
              res.download(downloadpath);
              res.download(file);
            });
          });
      }
    }
  });
});
app.get("/download", (req, res) => {
  const file = `./pdfs/${req.file.originalname}.pdf`;
  res.download(downloadpath);
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/showdata", (req, res) => {});

app.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});
