const express = require('express');
const mysql = require('mysql');
const crypto = require("crypto");

const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

//DB接続処理
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'H11rag13',
  database: 'shifty'
});

//接続エラーチェック
connection.connect((err) => {
  if (err) {
    console.log('error connecting: ' + err.stack);
    return;
  }
  console.log('success');
});

//ログインページ
app.get('/', (req, res) => {
  res.render('login.ejs');
});
//ログインチェック&トップページ
app.post('/index', (req, res) => {
  var pass = req.body.pass;
  // 暗号化
  var sha512 = crypto.createHash('sha512');
  sha512.update(pass)
  var hash = sha512.digest('hex')
  connection.query(
    'SELECT e.id, e.name, e.admin_flag, t.date,t.startAt, t.endAt FROM testemployee AS e LEFT JOIN testtime AS t ON t.employee_id = e.id where e.id=? AND e.password = ?',
    [req.body.id, hash],
    (error, results) => {
      //resultsがnullならリダイレクト
      if(results[0] == null){
        res.redirect('/');
      } else {
        res.render('index.ejs', {employees: results});
      }
    }
  );
});

//新規作成画面遷移&新規作成処理
app.get('/new', (req, res) => {
  res.render('new.ejs');
});
app.post('/create', (req, res) => {
  var pass = req.body.employeePass;
  // 暗号化
  var sha512 = crypto.createHash('sha512');
  sha512.update(pass)
  var hash = sha512.digest('hex')

  //データベースに追加する処理
  connection.query(
    'INSERT INTO testemployee (id, name, admin_flag, password) VALUES(?, ?, ?, ?)',
    [req.body.employeeId, req.body.employeeName, req.body.employeeAdmin, hash],
    (error, results) => {
      //一覧を表示する処理（リダイレクト）
      res.redirect('/');
    }
  );
});

app.listen(3000);
