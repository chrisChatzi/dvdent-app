var config = require("./server/config.js"),
    express = require('express'),
    path = require('path'),
    app = require('express')();
    http = require('http').Server(app),
    mongoose = require('mongoose'),
    mongodb = mongoose.connection,
    mongoPath = config.mongoPath,
    bodyParser = require('body-parser'),
    bcrypt = require('bcrypt-nodejs'),
    mail = require('nodemailer'),
    httpPort = process.env.PORT || config.port;

var Users = null;
var Categories = null;
var ProductsList = null;
var Products = null;
var Newsletter = null;

// mongoDB init
    var mongoDBFunction = (function(){
        // Get Mongoose to use the global promise library
        mongoose.Promise = global.Promise;
        //Get the default connection
        var db = mongoose.connection;
        //Bind connection to error event (to get notification of connection errors)
        db.on('error', console.error.bind(console, 'MongoDB connection error:'));
        var Schema = mongoose.Schema;

        // Create schemas
        // Users
        var usersSchema = new Schema({
            id: String,
            name: String,
            password: String,
            type: String,
        });
        Users = mongoose.model('users', usersSchema);
        // Categories
        var categoriesSchema = new Schema({
            id: String,
            name: String,
            title: String,
            titleEn: String
        });
        Categories = mongoose.model('categories', categoriesSchema);
        // Products list
        var productsListSchema = new Schema({
            id: String,
            cid: String,
            name: String,
            nameEn: String,
            img: Array,
            description: String,
            descriptionEn: String,
            info: String,
            price: String,
            details: Array,
            detailsEn: Array,
            immediate: Boolean,
            delivery: Boolean,
            created: Date,
            link: String
        });
        ProductsList = mongoose.model('products', productsListSchema);
        // Newsletter
        var newsletterSchema = new Schema({
            email: String,
            created: Date
        });
        Newsletter = mongoose.model('newsletters', newsletterSchema);

        httpServerFunction();

        mongoose.connect(mongoPath);
    }());

//send file request
   function httpServerFunction(){
        //express
            //static
                app.use('/', express.static((path.join(__dirname,'./dist'))));
            //ajax
                app.get('/categories', function (req, res) {
                    Categories.find({}, function(err, categories) {
                      if (err) throw err;
                      console.log('GET categories');
                      const result = categories.map(v => {return v.name})
                      res.send(JSON.stringify({ categories : result }));
                    });
                });

                app.use(bodyParser.json({limit: "50mb"}));
                app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

                app.post('/loginAdmin', function (req, res) {
                    Users.find({name: req.body.name}, function(err, user) {
                        if (err) throw err;
                        if(user.length === 0){
                            res.send(JSON.stringify({ admin : {error: 'name'} }));
                            return;
                        }
                        bcrypt.compare(req.body.pass, user[0].password, function(err, resCrypt) {
                            if(err) throw err;
                            if(resCrypt) res.send(JSON.stringify({ admin : {error: ''} }));
                            else res.send(JSON.stringify({ admin : {error: 'password'} }));
                        });
                    });
                });
                app.post('/getCategories', function (req, res) {
                    Categories.find({}, function(err, categories) {
                        if (err) throw err;
                        res.send(JSON.stringify({ categories : categories }));
                    });
                });
                app.post('/getProductsList', function (req, res) {
                    Categories.find({ name: req.body.type }, function(err, category) {
                        if (err) throw err;
                        ProductsList.find({ cid: category[0].id }, function(err, products) {
                            if (err) throw err;
                            res.send(JSON.stringify({ products : products }));
                        });
                    });
                });

                app.post('/setProduct', function (req, res) {
                    if(req.body.product.id && req.body.product.cid){
                        //exists, just update
                        delete req.body.product._id;
                        ProductsList.findOneAndUpdate({ id: req.body.product.id }, req.body.product, function(err, product) {
                            if (err) throw err;
                            res.send(JSON.stringify({success: true}))
                        });
                    }else{
                        // create new document
                        var newProductObj = req.body.product;
                        newProductObj.cid = req.body.category.id;
                        newProductObj.id = req.body.category.id+'-'+req.body.product.id;
                        newProductObj.nameEn = req.body.product.name;
                        newProductObj.descriptionEn = req.body.product.description;
                        newProductObj.detailsEn = req.body.product.details;
                        newProductObj.created = +new Date();
                        var newProduct = ProductsList(newProductObj);
                        newProduct.save(function(err) {
                            if (err) throw err;
                            console.log('Product created!');
                            res.send(JSON.stringify({success: true}))
                        });
                    }
                });

                app.post('/deleteProduct', function (req, res) {
                    ProductsList.findOneAndRemove({ id: req.body.product.id }, function(err) {
                        if (err) throw err;
                        console.log('Product deleted!');
                        res.send(JSON.stringify({success: true}))
                    });
                });

                app.post('/addSubscriber', function (req, res) {
                    Newsletter.find({ email: req.body.email }, function(err, email) {
                        if (err) throw err;
                        // Check if email exists to avoid duplicates
                        if(email.length === 0){
                            var subscriber = Newsletter({
                                email: req.body.email,
                                created: +new Date()
                            });
                            console.log(subscriber)
                            subscriber.save(function(err) {
                                if (err) throw err;
                                console.log('subscriber added!');
                                res.send(JSON.stringify({success: true}))
                            });
                        }else res.send(JSON.stringify({success: true}));
                    });
                });

                app.post('/findLast', function (req, res) {
                    ProductsList.find({ }).limit(5).sort({$natural:-1}).exec(function(err, products) {
                        if (err) throw err;
                        for(var i=0, l=products.length; i<l; i++){
                            if(typeof products[i].created !== 'undefined'){
                                console.log(products[i].created)
                                var date = new Date(products[i].created);
                                var sec = date.getTime();
                                console.log(sec)
                            }
                        }
                    });
                });

                app.post('/sendMsg', function (req, res) {
                    console.log(req.body)
                    let transporter = mail.createTransport({
                        service: 'yahoo',
                        auth: {
                            user: 'xchris777@yahoo.com',
                            pass: 'ca21d3yh7'
                        }
                    });
                    let mailOptions = {
                        from: req.body.info.email,
                        to: 'christos.chatziioannidis@gmail.com',
                        subject: 'Θέμα: '+req.body.info.subject+' Όνομα'+req.body.info.name,
                        text: req.body.info.msg
                    };

                    transporter.sendMail(mailOptions, (err, info) => {
                        if(err) throw err;
                        console.log('Message %s sent: %s', info.messageId, info.response);
                    });
                });

        //http listen
        http.listen(httpPort, function(){
            console.log('listening on:' + config.port);
            // mongoGet()
        });
    };
