require('../lib/db');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Logindata = mongoose.model('Logindata');
var Web3 = require('web3');
var SolidityFunction = require('web3/lib/web3/function');
var _ = require('lodash');
var Tx = require('ethereumjs-tx');
var ethereumUri = 'http://localhost:8545';


let web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(ethereumUri));

if(!web3.isConnected()){
    throw new Error('unable to connect to ethereum node at ' + ethereumUri);
}else{
    console.log('connected to ehterum node at ' + ethereumUri);
    var coinbase = web3.eth.coinbase;
    console.log('coinbase:' + coinbase);
    var balance = web3.eth.getBalance(coinbase);
    console.log('balance:' + web3.fromWei(balance, 'ether') + " ETH");
    var accounts = web3.eth.accounts;
    console.log(accounts);

    if (web3.personal.unlockAccount(coinbase, '111', 999999999)) {
        console.log("${"+coinbase+"} is unlocaked");
    }else{
        console.log("unlock failed, ${"+coinbase+"}");
    }
}

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/register', function(req, res, next) {

    console.log(req.body.name);
    console.log(req.body.schoolNum);
    console.log(req.body.email);
    console.log(req.body.password);

    Logindata.find({
        school_number : req.body.schoolNum

    }, function(err, logindatas, count) {
        console.log(logindatas);
        //檢查學號有沒有被註冊過  怕其他人隨意註冊公司可以去修改別人的資料
        if (logindatas.length === 0) {

            var address = web3.personal.newAccount(req.body.password);
            console.log(address);

                    new Logindata({
                        name: req.body.name,
                        school_number: req.body.schoolNum,
                        email: req.body.email,
                        password: req.body.password,
                        address:address
                    }).save(function(err) { //將帳密儲存到資料庫裡
                        if (err) {
                            console.log('Logindata Fail to save to DB.');
                            return;
                        }
                        console.log('Logindata Save to DB.');

                        //發送剛註冊所需的eth還有TGC
                        sendEth(coinbase,address);
                        sendTGC(coinbase,address);

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
            res.json({
                "message" : "此學號沒有註冊過",
                "name": "",
                "schoolNum" : "",
                "email" : "",
                "password" : "",
                "address" : "",
                "privateKey" : "",
                "logined" : false
            });
        } else {
            if (logindata[0].password === req.body.password) {
                console.log(req.session.email);
                console.log("登入成功");
                res.status(200);
                res.set({
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.json({
                    "message" : "登入成功",
                    "name": logindata[0].name,
                    "schoolNum" : logindata[0].school_number,
                    "email" : logindata[0].email,
                    "password" : logindata[0].password,
                    "address" : logindata[0].address,
                    "privateKey" : logindata[0].private_key,
                    "logined" : true
                        });
            } else { //沒找到密碼
                req.session.logined = false;
                res.status(200);
                res.set({
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.json({
                    "message" : "密碼錯誤請重新輸入",
                    "name": "",
                    "schoolNum" : "",
                    "email" : "",
                    "password" : "",
                    "address" : "",
                    "privateKey" : "",
                    "logined" : false
                });
            }
        }
    });
});

var trygongcontract = web3.eth.contract(
    [
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "name": "from",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "name": "to",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "name": "value",
                    "type": "uint256"
                }
            ],
            "name": "Transfer",
            "type": "event"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_questionId",
                    "type": "uint256"
                },
                {
                    "name": "_answerText",
                    "type": "string"
                }
            ],
            "name": "addAnswer",
            "outputs": [
                {
                    "name": "success",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_questionId",
                    "type": "uint256"
                },
                {
                    "name": "_answerId",
                    "type": "uint256"
                }
            ],
            "name": "addHeart",
            "outputs": [
                {
                    "name": "hearts",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_spender",
                    "type": "address"
                },
                {
                    "name": "_value",
                    "type": "uint256"
                }
            ],
            "name": "approve",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_spender",
                    "type": "address"
                },
                {
                    "name": "_subtractedValue",
                    "type": "uint256"
                }
            ],
            "name": "decreaseApproval",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_spender",
                    "type": "address"
                },
                {
                    "name": "_addedValue",
                    "type": "uint256"
                }
            ],
            "name": "increaseApproval",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_questionName",
                    "type": "string"
                },
                {
                    "name": "_text",
                    "type": "string"
                },
                {
                    "name": "_userName",
                    "type": "string"
                },
                {
                    "name": "_time",
                    "type": "uint256"
                },
                {
                    "name": "_money",
                    "type": "uint256"
                },
                {
                    "name": "_tag",
                    "type": "string"
                }
            ],
            "name": "newQuestion",
            "outputs": [
                {
                    "name": "id",
                    "type": "uint256"
                },
                {
                    "name": "questionName",
                    "type": "string"
                },
                {
                    "name": "text",
                    "type": "string"
                },
                {
                    "name": "userNamename",
                    "type": "string"
                },
                {
                    "name": "tag",
                    "type": "string"
                },
                {
                    "name": "time",
                    "type": "uint256"
                },
                {
                    "name": "money",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_questionId",
                    "type": "uint256"
                }
            ],
            "name": "sentBonus",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "name": "owner",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "name": "spender",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "name": "value",
                    "type": "uint256"
                }
            ],
            "name": "Approval",
            "type": "event"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_to",
                    "type": "address"
                },
                {
                    "name": "_value",
                    "type": "uint256"
                }
            ],
            "name": "transfer",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_from",
                    "type": "address"
                },
                {
                    "name": "_to",
                    "type": "address"
                },
                {
                    "name": "_value",
                    "type": "uint256"
                }
            ],
            "name": "transferFrom",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_owner",
                    "type": "address"
                },
                {
                    "name": "_spender",
                    "type": "address"
                }
            ],
            "name": "allowance",
            "outputs": [
                {
                    "name": "",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_owner",
                    "type": "address"
                }
            ],
            "name": "balanceOf",
            "outputs": [
                {
                    "name": "",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_questionId",
                    "type": "uint256"
                },
                {
                    "name": "_answerId",
                    "type": "uint256"
                }
            ],
            "name": "calculateIndivudalBonus",
            "outputs": [
                {
                    "name": "bonus",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_questionId",
                    "type": "uint256"
                }
            ],
            "name": "calculateTotalBonus",
            "outputs": [
                {
                    "name": "total",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [
                {
                    "name": "",
                    "type": "uint8"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "getDay",
            "outputs": [
                {
                    "name": "",
                    "type": "uint8"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "month",
                    "type": "uint8"
                },
                {
                    "name": "year",
                    "type": "uint16"
                }
            ],
            "name": "getDaysInMonth",
            "outputs": [
                {
                    "name": "",
                    "type": "uint8"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "getHour",
            "outputs": [
                {
                    "name": "",
                    "type": "uint8"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "getMinute",
            "outputs": [
                {
                    "name": "",
                    "type": "uint8"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "getMonth",
            "outputs": [
                {
                    "name": "",
                    "type": "uint8"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "getNow",
            "outputs": [
                {
                    "name": "time",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_questionId",
                    "type": "uint256"
                }
            ],
            "name": "getQuestion",
            "outputs": [
                {
                    "name": "id",
                    "type": "uint256"
                },
                {
                    "name": "questionName",
                    "type": "string"
                },
                {
                    "name": "text",
                    "type": "string"
                },
                {
                    "name": "userNamename",
                    "type": "string"
                },
                {
                    "name": "tag",
                    "type": "string"
                },
                {
                    "name": "time",
                    "type": "uint256"
                },
                {
                    "name": "money",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_questionId",
                    "type": "uint256"
                },
                {
                    "name": "_answerId",
                    "type": "uint256"
                }
            ],
            "name": "getQuestionAnswer",
            "outputs": [
                {
                    "name": "answerText",
                    "type": "string"
                },
                {
                    "name": "answerHeart",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_questionId",
                    "type": "uint256"
                }
            ],
            "name": "getQuestionAnswerCount",
            "outputs": [
                {
                    "name": "answerCount",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_questionId",
                    "type": "uint256"
                }
            ],
            "name": "getQuestionAtIndex",
            "outputs": [
                {
                    "name": "question",
                    "type": "string"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "getQuestionCount",
            "outputs": [
                {
                    "name": "questionCount",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "getSecond",
            "outputs": [
                {
                    "name": "",
                    "type": "uint8"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "getWeekday",
            "outputs": [
                {
                    "name": "",
                    "type": "uint8"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "getYear",
            "outputs": [
                {
                    "name": "",
                    "type": "uint16"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "INITIAL_SUPPLY",
            "outputs": [
                {
                    "name": "",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_time",
                    "type": "uint256"
                }
            ],
            "name": "isDeadline",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "year",
                    "type": "uint16"
                }
            ],
            "name": "isLeapYear",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "year",
                    "type": "uint256"
                }
            ],
            "name": "leapYearsBefore",
            "outputs": [
                {
                    "name": "",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "name",
            "outputs": [
                {
                    "name": "",
                    "type": "string"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "symbol",
            "outputs": [
                {
                    "name": "",
                    "type": "string"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "totalSupply",
            "outputs": [
                {
                    "name": "",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "year",
                    "type": "uint16"
                },
                {
                    "name": "month",
                    "type": "uint8"
                },
                {
                    "name": "day",
                    "type": "uint8"
                },
                {
                    "name": "hour",
                    "type": "uint8"
                },
                {
                    "name": "minute",
                    "type": "uint8"
                },
                {
                    "name": "second",
                    "type": "uint8"
                }
            ],
            "name": "toTimestamp",
            "outputs": [
                {
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "year",
                    "type": "uint16"
                },
                {
                    "name": "month",
                    "type": "uint8"
                },
                {
                    "name": "day",
                    "type": "uint8"
                },
                {
                    "name": "hour",
                    "type": "uint8"
                }
            ],
            "name": "toTimestamp",
            "outputs": [
                {
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "year",
                    "type": "uint16"
                },
                {
                    "name": "month",
                    "type": "uint8"
                },
                {
                    "name": "day",
                    "type": "uint8"
                },
                {
                    "name": "hour",
                    "type": "uint8"
                },
                {
                    "name": "minute",
                    "type": "uint8"
                }
            ],
            "name": "toTimestamp",
            "outputs": [
                {
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "year",
                    "type": "uint16"
                },
                {
                    "name": "month",
                    "type": "uint8"
                },
                {
                    "name": "day",
                    "type": "uint8"
                }
            ],
            "name": "toTimestamp",
            "outputs": [
                {
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "who",
            "outputs": [
                {
                    "name": "",
                    "type": "address"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "whoboss",
            "outputs": [
                {
                    "name": "",
                    "type": "address"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }
    ]).at("0x5b9a2e438ac8bcd8805a426b7845cbe36fcc13b7");

router.post('/getETH', function(req, res, next) {
    console.log(req.body.address);

    var ethvalue = web3.eth.getBalance(req.body.address);
    console.log("ETHvalue is :"+ethvalue);
    res.status(200);
    res.set({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.json({
        "ETHvalue" : ethvalue
    });
});

router.post('/getTGC', function(req, res, next) {
    console.log(req.body.address);

    let TGCvalue = trygongcontract.balanceOf(req.body.address,
        {
            from: coinbase
        });
    console.log('TGCvalue is : ' + TGCvalue);
    res.status(200);
    res.set({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.json({
        "TGCvalue" : TGCvalue
    });
});


function sendEth(_from,_to) {
    //發送eth給剛註冊的用戶用來之後的傳送token
    var txnObject = {
        "from": _from,
        "to": _to,
        "value": web3.toWei(1, 'ether'),
        // "gas": 21000,          // (optional)
        // "gasPrice": 4500000,   // (optional)
        // "data": 'For testing', // (optional)
        // "nonce": 10            // (optional)
    };
    web3.eth.sendTransaction(txnObject, function(error, result){
        if(error) {
            // error handle
        } else {
            var txn_hash = result; //Get transaction hash
            console.log('txn_hash=' + txn_hash);
        }
    });
}

function sendTGC(_from,_to) {

    let txHash = trygongcontract.transfer(_to, 300,
        {
            from: _from,
            gas: 3141592
        });
    console.log('txHash is : ' + txHash);
    console.log('傳送TGC');
}

router.post('/newQuestion', function(req, res, next) {

    if (web3.personal.unlockAccount(req.body.address, req.body.password, 999999999)) {
        console.log("${"+req.body.address+"} is unlocaked");

        let txHash = trygongcontract.newQuestion(req.body.questionName, req.body.text, req.body.userName, req.body.time/1000, req.body.money, req.body.tag,
            {
                from: req.body.address,
                gas: 3141592
            });
        console.log('txHash is : ' + txHash);
        console.log('新增問題成功');
        res.status(200);
        res.set({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.json({
            "message" : "新增問題成功"
        });

    }else{
        console.log("unlock failed, ${"+req.body.address+"}");
    }

    console.log(req.body.address);
    console.log(req.body.password);
    console.log(req.body.questionName);
    console.log(req.body.text);
    console.log(req.body.money);
    console.log(req.body.tag);
    console.log(req.body.time);
    console.log(req.body.userName);
    console.log(req.body.schoolNum);
});

function getQuestionCount() {
    var getQuestionCount = trygongcontract.getQuestionCount(
        {from: coinbase});
    console.log('getQuestionNum is : ' + getQuestionCount);
    return getQuestionCount.toNumber();
}

router.post('/getQuestionCount', function(req, res, next) {
    res.status(200);
    res.set({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.json({
        "getQuestionCount" : getQuestionCount()
    });
});

router.post('/getQuestionFour', function(req, res, next) {

    var questionCount = getQuestionCount();
    questionCount = questionCount - (req.body.page-1)*4;

    var getQuestion = trygongcontract.getQuestion(questionCount,
    {
        from: coinbase
    });
    console.log('getQuestion is : ' + getQuestion);
    console.log(getQuestion[2]);
    var getQuestion2 = trygongcontract.getQuestion(questionCount-1,
        {
            from: coinbase
        });
    console.log('getQuestion is : ' + getQuestion2);
    var getQuestion3 = trygongcontract.getQuestion(questionCount-2,
        {
            from: coinbase
        });
    console.log('getQuestion is : ' + getQuestion3);
    var getQuestion4 = trygongcontract.getQuestion(questionCount-3,
        {
            from: coinbase
        });
    console.log('getQuestion is : ' + getQuestion4);


    res.status(200);
    res.set({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.json([{
        "id" : getQuestion[0],
        "questionName" : getQuestion[1],
        "time" : getQuestion[5],
        "money" : getQuestion[6]},
        {
        "id" : getQuestion2[0],
        "questionName" : getQuestion2[1],
        "time" : getQuestion2[5],
        "money" : getQuestion2[6]},
        {
            "id" : getQuestion3[0],
            "questionName" : getQuestion3[1],
            "time" : getQuestion3[5],
            "money" : getQuestion3[6]},
        {
            "id" : getQuestion4[0],
            "questionName" : getQuestion4[1],
            "time" : getQuestion4[5],
            "money" : getQuestion4[6]
        }]
        );
});

router.post('/getQuestion', function(req, res, next) {

    var getQuestion = trygongcontract.getQuestion(req.body.questionId,
        {
            from: coinbase
        });
    console.log('getQuestion is : ' + getQuestion);

    res.status(200);
    res.set({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.json({
        "id" : getQuestion[0],
        "questionName" : getQuestion[1],
        "text" : getQuestion[2],
        "userName" : getQuestion[3],
        "tag" : getQuestion[4],
        "time" : getQuestion[5],
        "money" : getQuestion[6]}
    );
});


router.post('/addAnswer', function(req, res, next) {

    console.log(req.body.questionId);
    console.log(req.body.answerText);
    if (web3.personal.unlockAccount(req.body.address, req.body.password, 999999999)) {
        console.log("${"+req.body.address+"} is unlocaked");
        var txHash = trygongcontract.addAnswer(req.body.questionId,req.body.answerText,
            {
                from: req.body.address,
                gas: 3141592
            });
        console.log('txHash is : ' + txHash);

        res.status(200);
        res.set({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.json({
            "message" : "添加成功"}
        );
    }else{
        console.log("unlock failed, ${"+req.body.address+"}");
    }
});

function getQuestionAnswerCount(_questionId) {
    var getQuestionAnswerCount = trygongcontract.getQuestionAnswerCount(_questionId,
        {from: coinbase});
    console.log('getQuestionAnswerCount is : ' + getQuestionAnswerCount);
    return getQuestionAnswerCount.toNumber();
}

router.post('/getQuestionAnswerAll', function(req, res, next) {

    var questionAnswerCount;
    questionAnswerCount = getQuestionAnswerCount(req.body.questionId);
    console.log(questionAnswerCount);
    var text = "[";
    var ii=0;
    for (i = 1; i < questionAnswerCount+1; i++) {
        var getAnswer = trygongcontract.getQuestionAnswer(req.body.questionId,i,
            {
                from: coinbase
            });
        console.log('getQuestion is : ' + getAnswer);
        text += '{\"answerId\":'+i+',\"answerText\":\"'+getAnswer[0]+'\",\"answerHeart\":'+getAnswer[1]+'},';
        ii=1;
    }
    if(ii==1){
        text = text.slice(0,-1)
    }
    text += "]"
    console.log(text)
    console.log(JSON.parse(text))
    var answerjson = JSON.parse(text);
    console.log(answerjson)

    res.status(200);
    res.set({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.json(answerjson
    );
});


router.post('/addHeart', function(req, res, next) {

    console.log(req.body.questionId);
    console.log(req.body.answerId);
    if (web3.personal.unlockAccount(req.body.address, req.body.password, 999999999)) {
        console.log("${"+req.body.address+"} is unlocaked");
        var txHash = trygongcontract.addHeart(req.body.questionId,req.body.answerId,
            {
                from: req.body.address,
                gas: 3141592
            });
        console.log('txHash is : ' + txHash);

        res.status(200);
        res.set({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.json({
            "message" : "按讚成功"}
        );
    }else{
        console.log("unlock failed, ${"+req.body.address+"}");
    }
});




var period = 10000; // 1 second
setInterval(function() {

    for(i = 0; i < getQuestionCount(); i++){
        var sentBonus = trygongcontract.sentBonus(i,
            {from: coinbase});
        //console.log('sentBonus is : ' + sentBonus);
    }

    //console.log("tick");

}, period);














module.exports = router;
