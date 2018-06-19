var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

//登入資料
var Logindata = new Schema({
    id: Number,
    name: String,
    school_number: Number,
    email: String,
    password: String,
    address: String,
    private_key: String
});

//檔案資料
var File = new Schema({
    Companyname: String,
    Originalname: String,
    Filename: String,
    CreateDate: Date
});
//刪除檔案的資料
var DFile = new Schema({
    Companyname: String,
    Originalname: String,
    Filename: String,
    CreateDate: Date
});


mongoose.model( 'File', File );
mongoose.model( 'DFile', DFile );
mongoose.model( 'Logindata', Logindata );
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://nccu:nccutest123@ds263590.mlab.com:63590/trygong');