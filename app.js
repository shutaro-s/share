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
  password: 'shutaro',
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
app.get('/index', (req, res) => {
  res.redirect('/');
});
app.post('/index', (req, res) => {
    var pass = req.body.pass;
    var id = req.body.id;
    // 暗号化
    var sha512 = crypto.createHash('sha512');
    sha512.update(pass)
    var hash = sha512.digest('hex')
  connection.query(
    'SELECT e.id, e.name, e.admin_flag, e.password, t.id AS shift_id, YEAR(t.startAt) AS YEAR, MONTH(t.startAt) AS MONTH, DAY(t.startAt) AS DAY,DAYOFWEEK(t.startAt) AS DAYOFWEEK, DATE_FORMAT(t.startAt, "%k:%i") AS STARTTIME, DATE_FORMAT(t.endAt, "%k:%i") AS ENDTIME, t.ex FROM testemployee AS e LEFT JOIN testtime AS t ON t.employee_id = e.id WHERE e.id = ? AND e.password = ? ORDER BY t.startAt ASC',
    [id, hash],
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

//全体確認（シフト）
app.get('/confirm', (req, res) => {
  connection.query(
    'SELECT e.id, e.name, t.id AS shift_id, e.admin_flag, YEAR(t.startAt) AS YEAR, MONTH(t.startAt) AS MONTH, DAY(t.startAt) AS DAY,DAYOFWEEK(t.startAt) AS DAYOFWEEK, DATE_FORMAT(t.startAt, "%k:%i") AS STARTTIME, DATE_FORMAT(t.endAt, "%k:%i") AS ENDTIME, t.ex FROM testemployee AS e INNER JOIN testtime AS t ON t.employee_id = e.id ORDER BY t.startAt ASC',
    (error, results) => {
        res.render('confirm.ejs', {shifts: results});
    }
  );
});
//全体確認（従業員）
app.get('/employee', (req, res) => {
  connection.query(
    'SELECT id, name, admin_flag, DATE_FORMAT(created_at, "%Y-%m-%d") AS date FROM testemployee ORDER BY date',
    (error, results) => {
        res.render('employee.ejs', {employees: results});
    }
  );
});
//従業員編集
app.get('/editemployee/:id',(req,res)=>{
  connection.query(
    'SELECT id, name, admin_flag FROM testemployee WHERE id = ?',
    [req.params.id],
    (error,results)=>{
      res.render('editemployee.ejs',{employees:results});
    }
  )
});
app.post('/updateemployee/:id',(req,res)=>{
  connection.query(
    'UPDATE testemployee SET id = ?, name = ?, admin_flag = ? WHERE id = ?',
    [req.body.employeeId, req.body.employeeName, req.body.employeeAdmin, req.params.id],
    (error,results)=>{
      connection.query(
        'SELECT id, name, admin_flag, DATE_FORMAT(created_at, "%Y-%m-%d") AS date FROM testemployee ORDER BY date',
        (error, results) => {
            res.render('employee.ejs', {employees: results});
        }
      );
    }
  )
});
//従業員削除
app.post('/deleteemployee/:id',(req,res)=>{
  connection.query(
    'DELETE FROM testemployee WHERE id = ?',
    [req.params.id],
    (error,results)=>{
      connection.query(
        'SELECT id, name, admin_flag, DATE_FORMAT(created_at, "%Y-%m-%d") AS date FROM testemployee ORDER BY date',
        (error, results) => {
            res.render('employee.ejs', {employees: results});
        }
      );
    }
  )
});

//新規作成画面遷移&新規作成処理
app.get('/new', (req, res) => {
  res.redirect('/');
});
app.get('/new/:password', (req, res) => {
  connection.query(
    'SELECT * FROM testemployee WHERE password = ?',
    [req.params.password],
    (error, results) => {
      //resultsがnullならリダイレクト
      if(results[0] == null){
        res.redirect('/');
      } else {
        res.render('new.ejs');
      }
    }
  );
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

//パスワード変更
app.get('/pass/:id', (req, res) => {
  connection.query(
    'SELECT * FROM testemployee WHERE id = ?',
    [req.params.id],
    (error, results) => {
      //resultsがnullならリダイレクト
      if(results[0] == null){
        res.redirect('/');
      } else {
        res.render('pass.ejs', {employees: results});
      }
    }
  );
});
app.post('/change/:id', (req, res) => {
  var pass = req.body.pass;
  // 暗号化
  var sha512 = crypto.createHash('sha512');
  sha512.update(pass)
  var hash = sha512.digest('hex')
  connection.query(
    'UPDATE testemployee SET password = ? WHERE id = ?',
    [hash, req.params.id],
    (error, results) => {
      res.redirect('/');
    }
  );
});

//シフト提出
app.get('/submit/:id/:password', (req, res) => {
  var params = req.params;
  res.render('submit.ejs', {ids: params});
});
app.post('/shift/:id', (req, res) => {
  var date_str = req.body.date;
  var start_str = date_str + " " + req.body.startHour + "*" + req.body.startMinute + "*00";
  var end_str = date_str + " " + req.body.endHour + "*" + req.body.endMinute + "*00";
  connection.query(
    'INSERT INTO testtime (employee_id, startAt, endAt, ex) VALUES(?, ?, ?, ?)',
    [req.params.id, start_str, end_str, req.body.ex],
    (error, results) => {
      connection.query(
        'SELECT e.id, e.name, e.admin_flag, e.password, t.id AS shift_id, YEAR(t.startAt) AS YEAR, MONTH(t.startAt) AS MONTH, DAY(t.startAt) AS DAY,DAYOFWEEK(t.startAt) AS DAYOFWEEK, DATE_FORMAT(t.startAt, "%k:%i") AS STARTTIME, DATE_FORMAT(t.endAt, "%k:%i") AS ENDTIME, t.ex FROM testemployee AS e LEFT JOIN testtime AS t ON t.employee_id = e.id WHERE e.id = ? ORDER BY t.startAt ASC',
        [req.params.id],
        (error,results)=>{
          res.render('complete.ejs',{employees:results});
        }
      );
    }
  );
});

//シフト編集
app.get('/edit/:shift_id',(req,res)=>{
  connection.query(
    'SELECT id, employee_id, DATE_FORMAT(startAt, "%Y-%m-%d") AS update_date, HOUR(startAt) AS starth, MINUTE(startAt) AS startm, HOUR(endAt) AS endh, MINUTE(endAt) AS endm, ex FROM testtime WHERE id = ?',
    [req.params.shift_id],
    (error,results)=>{
      res.render('edit.ejs',{timesheets:results});
    }
  )
});
app.post('/update/:id/:employee_id',(req,res)=>{
  var date_str = req.body.date;
  var start_str = date_str + " " + req.body.startHour + "*" + req.body.startMinute + "*00";
  var end_str = date_str + " " + req.body.endHour + "*" + req.body.endMinute + "*00";
  connection.query(
    'UPDATE testtime SET startAt = ?, endAt = ?, ex = ? WHERE id = ?',
    [start_str, end_str, req.body.ex, req.params.id],
    (error,results)=>{
      connection.query(
        'SELECT e.id, e.name, e.admin_flag, e.password, t.id AS shift_id, YEAR(t.startAt) AS YEAR, MONTH(t.startAt) AS MONTH, DAY(t.startAt) AS DAY,DAYOFWEEK(t.startAt) AS DAYOFWEEK, DATE_FORMAT(t.startAt, "%k:%i") AS STARTTIME, DATE_FORMAT(t.endAt, "%k:%i") AS ENDTIME, t.ex FROM testemployee AS e LEFT JOIN testtime AS t ON t.employee_id = e.id WHERE e.id = ? ORDER BY t.startAt ASC',
        [req.params.employee_id],
        (error,results)=>{
          res.render('complete.ejs',{employees:results});
        }
      )
    }
  )
});

//シフト削除
app.post('/delete/:shift_id/:id',(req,res)=>{
  connection.query(
    'DELETE FROM testtime WHERE id = ?',
    [req.params.shift_id],
    (error,results)=>{
      connection.query(
        'SELECT e.id, e.name, e.admin_flag, e.password, t.id AS shift_id, YEAR(t.startAt) AS YEAR, MONTH(t.startAt) AS MONTH, DAY(t.startAt) AS DAY,DAYOFWEEK(t.startAt) AS DAYOFWEEK, DATE_FORMAT(t.startAt, "%k:%i") AS STARTTIME, DATE_FORMAT(t.endAt, "%k:%i") AS ENDTIME, t.ex FROM testemployee AS e LEFT JOIN testtime AS t ON t.employee_id = e.id WHERE e.id = ? ORDER BY t.startAt ASC',
        [req.params.id],
        (error,results)=>{
          res.render('complete.ejs',{employees:results});
        }
      )
    }
  )
});

//完了処理
app.post('/complete',(req, res)=>{
  connection.query(
    'SELECT e.id, e.name, e.admin_flag, e.password, t.id AS shift_id, YEAR(t.startAt) AS YEAR, MONTH(t.startAt) AS MONTH, DAY(t.startAt) AS DAY,DAYOFWEEK(t.startAt) AS DAYOFWEEK, DATE_FORMAT(t.startAt, "%k:%i") AS STARTTIME, DATE_FORMAT(t.endAt, "%k:%i") AS ENDTIME, t.ex FROM testemployee AS e LEFT JOIN testtime AS t ON t.employee_id = e.id WHERE e.id = ? ORDER BY t.startAt ASC',
    [req.body.id],
    (error, results) => {
      res.render('index.ejs', {employees: results});
    }
  )
});


//フィルタリング機能
app.post('/filter',(req,res)=>{
  if(req.body.person == 0123456789876543210){
    connection.query(
      'SELECT e.id, e.name, t.id AS shift_id, YEAR(t.startAt) AS YEAR, MONTH(t.startAt) AS MONTH, DAY(t.startAt) AS DAY,DAYOFWEEK(t.startAt) AS DAYOFWEEK, DATE_FORMAT(t.startAt, "%k:%i") AS STARTTIME, DATE_FORMAT(t.endAt, "%k:%i") AS ENDTIME, t.ex FROM testemployee AS e LEFT JOIN testtime AS t ON t.employee_id = e.id WHERE DATE_FORMAT(t.startAt,"%Y-%m-%d") = ? ORDER BY t.startAt ASC',
      [req.body.date],
      (error,results)=>{
        res.render('confirm.ejs',{shifts:results});
      }
    )
  }else if(req.body.date == ""){
    connection.query(
      'SELECT e.id, e.name, t.id AS shift_id, YEAR(t.startAt) AS YEAR, MONTH(t.startAt) AS MONTH, DAY(t.startAt) AS DAY,DAYOFWEEK(t.startAt) AS DAYOFWEEK, DATE_FORMAT(t.startAt, "%k:%i") AS STARTTIME, DATE_FORMAT(t.endAt, "%k:%i") AS ENDTIME, t.ex FROM testemployee AS e LEFT JOIN testtime AS t ON t.employee_id = e.id WHERE e.id = ? ORDER BY t.startAt ASC',
      [req.body.person],
      (error,results)=>{
        res.render('confirm.ejs',{shifts:results});
      }
    )
  }else{
    connection.query(
      'SELECT e.id, e.name, t.id AS shift_id, YEAR(t.startAt) AS YEAR, MONTH(t.startAt) AS MONTH, DAY(t.startAt) AS DAY,DAYOFWEEK(t.startAt) AS DAYOFWEEK, DATE_FORMAT(t.startAt, "%k:%i") AS STARTTIME, DATE_FORMAT(t.endAt, "%k:%i") AS ENDTIME, t.ex FROM testemployee AS e LEFT JOIN testtime AS t ON t.employee_id = e.id WHERE DATE_FORMAT(t.startAt,"%Y-%m-%d") = ? AND e.id = ? ORDER BY t.startAt ASC',
      [req.body.date, req.body.person],
      (error,results)=>{
        res.render('confirm.ejs',{shifts:results});
      }
    )
  }
});

app.listen(3000);
