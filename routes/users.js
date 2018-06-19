require('../lib/db');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Logindata = mongoose.model('Logindata');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/register', function(req, res, next) {

    Logindata.find({
        school_number : req.body.schoolNum

    }, function(err, logindatas, count) {
        console.log(logindatas);
        //檢查公司名稱有沒有被註冊過  怕其他人隨意註冊公司可以去修改別人的資料
        if (logindatas.length === 0) {
                    new Logindata({
                        name: req.body.name,
                        school_number: req.body.schoolNum,
                        email: req.body.email,
                        password: req.body.password,
                        address:req.body.address,
                        private_key: req.body.privateKey
                    }).save(function(err) { //將帳密儲存到資料庫裡
                        if (err) {
                            console.log('Logindata Fail to save to DB.');
                            return;
                        }
                        console.log('Logindata Save to DB.');
                        req.session.name = req.body.name;
                        req.session.schoolNum = req.body.schoolNum;
                        req.session.email = req.body.email;
                        req.session.password = req.body.password;
                        req.session.address = req.body.address;
                        req.session.privateKey = req.body.privateKey;
                        req.session.logined = true;

                        res.status(200);
                        res.set({
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        });
                        res.json({"name": req.session.name});
                    });
        } else {
            req.session.logined = false;
            res.render('users/register', {
                message : "公司名稱 : " + req.body.companyname + " 被註冊過了喔 "
            });
        }
    });
});



module.exports = router;
