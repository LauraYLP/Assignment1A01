///second change for control version
////First change for control version
// import dependencies you will use
const express = require('express');
const path = require('path');
const fileUpload = require('express-fileupload');
const mongoose = require('mongoose');
const session = require('express-session');

//const bodyParser = require('body-parser'); // not required for Express 4.16 onwards as bodyParser is now included with Express
// set up expess validator
const {check, validationResult} = require('express-validator'); //destructuring an object

// connect to DB
mongoose.connect('mongodb://localhost:27017/coffeeStore',{
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// define the model

const Item = mongoose.model('Item', {
    cName : String,
    cEmailPhone : String,
    cDescription : String,
    cImageName : String
});

// define model for admin users

const User = mongoose.model('User', {
    uName: String,
    uPass: String
});

// set up variables to use packages
var myApp = express();

// set up the session middleware
myApp.use(session({
    secret: 'superrandomsecret',
    resave: false,
    saveUninitialized: true
}));

// myApp.use(bodyParser.urlencoded({extended:false})); // old way before Express 4.16
myApp.use(express.urlencoded({extended:false})); // new way after Express 4.16
myApp.use(fileUpload()); // set up the express file upload middleware to be used with Express
// set path to public folders and view folders
 
myApp.set('views', path.join(__dirname, 'views'));
//use public folder for CSS etc.
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');


var nameRegex = /^[a-zA-Z0-9]{1,}\s[a-zA-Z0-9]{1,}$/;

// set up different routes (pages) of the website
// render the home page
myApp.get('/',function(req, res){
    res.render('home'); // will render views/home.ejs
});

// render thanks Submit page
myApp.get('/thanksSubmit',function(req, res){
    res.render('thanksSubmit'); // will render views/thanksSubmit.ejs
});

// render thanks Edit page
myApp.get('/thanksEdit',function(req, res){
    res.render('thanksEdit'); // will render views/thanksEdit.ejs
});

// render thanks Delete page
myApp.get('/thanksDelete',function(req, res){
    res.render('thanksDelete'); // will render views/thanksDelete.ejs
});

// render the login page
myApp.get('/login',function(req, res){
    res.render('login'); // will render views/login.ejs
});

myApp.post('/login', function(req, res){
    // fetch username and pass
    var uName = req.body.uName;
    var uPass = req.body.uPass;

    // find it in the database
    User.findOne({uName: uName, uPass: uPass}).exec(function(err, user){
        // set up the session variables for logged in users
        console.log('Errors: ' + err);
        if(user){
            req.session.uName = user.uName;
            req.session.loggedIn = true;
            // redirect to dashboard
            res.redirect('/allitems');
        }
        else{
            res.redirect('/login'); // in case you want to redirect the user to login
            // alternatively, render login form with errors
            //res.render('login', {error: 'Incorrect username/password'}); // complete the logic on login.ejs file to show the error only if error is undefined.
        }
    });
});

// show all items
myApp.get('/allitems',function(req, res){
    if(req.session.loggedIn){
        // write some code to fetch all the items from db and send to the view allitems
        Item.find({}).exec(function(err, items){
            console.log(err);
            console.log(items);
            res.render('allitems', {items:items}); // will render views/allitems.ejs
        });
    }
    else{
        res.redirect('/login');
    }
});

myApp.get('/logout', function(req, res){
    // destroy the whole session
    // req.session.destroy();
    // alternatively just unset the variables you had set 
    req.session.uName = '';
    req.session.loggedIn = false;
    res.redirect('/login');
});

// show only one item depending on the id, just like amazon products
// https://www.amazon.ca/dp/B08KJN3333
myApp.get('/print/:itemid', function(req, res){
    // --------add some logic to put this page behind login---------
    // write some code to fetch a item and create pageData
    var itemId = req.params.itemid;
    Item.findOne({_id: itemId}).exec(function(err, item){
        res.render('item', item); // render item.ejs with the data from item
    });
})
// to delete a item from the database
myApp.get('/delete/:itemid', function(req, res){
    // --------add some logic to put this page behind login---------
    var itemId = req.params.itemid;
    Item.findByIdAndDelete({_id: itemId}).exec(function(err, item){
        //res.render('delete', item); // render delete.ejs with the data from item
        // send the data to the view and render it
        res.render('thanksDelete', item); //LYLP thanks per delete
    });
})
// edit a item
myApp.get('/edit/:itemid', function(req, res){
    // --------add some logic to put this page behind login---------
    var itemId = req.params.itemid;
    // write some logic to show the item in a form with the details
    Item.findOne({_id: itemId}).exec(function(err, item){
        res.render('edit', item); // render edit.ejs with the data from item
    });
})

// process the edited form from admin
myApp.post('/editprocess/:itemid', function(req,res){
    if(!req.session.loggedIn){
        res.redirect('/login');
    }
    else{
        //fetch all the form fields
        var cName = req.body.cName; // the key here is from the name attribute not the id attribute
        var cEmailPhone = req.body.cEmailPhone;
        var cDescription = req.body.cDescription;
        var cImageName = req.files.cImage.name;
        var cImageFile = req.files.cImage; // this is a temporary file in buffer.
        // check if the file already exists or employ some logic that each filename is unique.
        var cImagePath = 'public/uploads/' + cImageName;
        // move the temp file to a permanent location mentioned above
        cImageFile.mv(cImagePath, function(err){
            console.log(err);
        });
        // find the item in database and update it
        var itemId = req.params.itemid;
        Item.findOne({_id: itemId}).exec(function(err, item){
            // update the item and save
            item.cName = cName;
            item.cEmailPhone = cEmailPhone;
            item.cDescription = cDescription;
            item.cImageName = cImageName;
            item.save();
            //res.render('thanks', item); // render item.ejs with the data from item
            res.render('thanksEdit', item); //LYLP thanks per Edit
        });      
    }
});

// process the form submission from the user
myApp.post('/process',[
    check('cDescription', 'Please enter a description issue.').not().isEmpty(),
    check('cEmailPhone', 'Please enter an email or phone').not().isEmpty(),
    check('cName', 'Please enter firstname and lastname').matches(nameRegex)
], function(req,res){

    // check for errors
    const errors = validationResult(req);
    console.log(errors);
    if(!errors.isEmpty())
    {
        res.render('home',{er: errors.array()});
    }
    else
    {
        //fetch all the form fields
        var cName = req.body.cName; // the key here is from the name attribute not the id attribute
        var cEmailPhone = req.body.cEmailPhone;
        var cDescription = req.body.cDescription;

        // fetch the file 
        // get the name of the file
        var cImageName = req.files.cImage.name;
        // get the actual file
        var cImageFile = req.files.cImage; // this is a temporary file in buffer.

        // save the file
        // check if the file already exists or employ some logic that each filename is unique.
        var cImagePath = 'public/uploads/' + cImageName;
        // move the temp file to a permanent location mentioned above
        cImageFile.mv(cImagePath, function(err){
            console.log(err);
        });

        // create an object with the fetched data to send to the view
        var pageData = {
            cName : cName,
            cEmailPhone : cEmailPhone,
            cDescription : cDescription,
            cImageName : cImageName
        }

        // create an object from the model to save to DB
        var myItem = new Item(pageData);
        // save it to DB
        myItem.save();

        // send the data to the view and render it
        res.render('thanksSubmit', pageData); //LYLP thanks per submit
    }
});

// setup routes

myApp.get('/setup', function(req, res){

    let userData = [
        {
            uName: 'admin',
            uPass: 'admin'
        }
    ]
    User.collection.insertMany(userData);
    res.send('data added');
});

// start the server and listen at a port
myApp.listen(8080);

//tell everything was ok
console.log('Everything executed fine.. website at port 8080....');