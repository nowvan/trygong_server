require('../lib/db');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Logindata = mongoose.model('Logindata');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/logined', function(req, res, next) {
    if(req.session.logined == true){
        res.status(200);
        res.set({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.json({"logined": "success"});
    }
    else{
        res.status(200);
        res.set({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.json({"logined": "false"});
    }
});

router.post('/register', function(req, res, next) {

    console.log(req.body.name);
    console.log(req.body.schoolNum);
    console.log(req.body.email);
    console.log(req.body.password);
    console.log(req.body.address);
    console.log(req.body.privateKey);


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
                        res.json({"message": "註冊成功"});
                    });
        } else {
            req.session.logined = false;
            res.status(200);
            res.set({
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.json({"message": "註冊失敗"});
        }
    });
});

router.post('/login', function(req, res, next) {

    console.log(req.body.schoolNum);
    console.log(req.body.password);

    Logindata.find({
        school_number : req.body.schoolNum
    }, function(err, logindata, count) {
        console.log(logindata);
        //沒找到帳號
        if (logindata.length === 0) {
            req.session.logined = false;
            res.status(200);
            res.set({
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.json({"message": "此學號沒有註冊過"});
        } else {
            if (logindata[0].password === req.body.password) {
                req.session.name = logindata[0].name;
                req.session.schoolNum = logindata[0].schoolNum;
                req.session.email = logindata[0].email;
                req.session.password = logindata[0].password;
                req.session.address = logindata[0].address;
                req.session.privateKey = logindata[0].privateKey;
                req.session.logined = true;

                console.log(req.session.email);
                console.log("登入成功");
                res.status(200);
                res.set({
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.json({"name": logindata[0].name});


            } else { //沒找到密碼
                req.session.logined = false;
                res.status(200);
                res.set({
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.json({"message": "密碼錯誤請重新輸入"});
            }
        }
    });
});








module.exports = router;
