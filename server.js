const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const session = require('express-session')
const FileStore = require('session-file-store')(session)
const path = require('path');


const app = express();
const template = require('./template.js');
const port = 3000;

// 세션 설정
app.use(
    session({
      secret: '1111',  // 암호화에 사용되는 비밀 키
      resave: false,
      saveUninitialized: true,
      store: new FileStore({
        path: path.join(__dirname, 'sessions'), // 세션 데이터를 저장할 디렉토리를 설정합니다.
      }),  // 세션 데이터를 파일로 저장하는 예시. 필요에 따라 다른 저장소를 사용할 수 있습니다.
    })
  );

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'kms',
    password: '12345',
    database: 'post'
});

connection.connect((err) => {
    if (err) {
        console.error('MySQL connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL as id ' + connection.threadId);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static('public'));

// 게시글 생성
app.post('/posts', (req, res) => {
    username=req.session.nickname;
    if(username === undefined){
        console.log('로그인 먼저하세요.');
    }

    else{
        const { title, content } = req.body;            
        const insertQuery = 'INSERT INTO posts (title, content) VALUES (?, ?)';
        //console.log(title, content);
        connection.query(insertQuery, [title, content], (error, results) => {
            if (error) {
                res.status(500).json({ success: false, message: '게시글 생성 실패' });
            } else {
                res.json({ success: true, message: '게시글 생성 성공' });
            }
        });
        //console.log('성공');
    }
    
});

// 모든 게시글 조회
app.get('/posts', (req, res) => {
    const selectQuery = 'SELECT * FROM posts';

    connection.query(selectQuery, (error, results) => {
        if (error) {
            res.status(500).json({ success: false, message: '게시글 조회 실패' });
        } else {
            res.json({ success: true, posts: results });
        }
    });
});

// 게시글 수정
app.put('/posts/:id', (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;
    const updateQuery = 'UPDATE posts SET title = ?, content = ? WHERE id = ?';
    username=req.session.nickname;
    if(username === undefined){
        console.log('로그인 먼저하세요.');
        //res.send(`<script type='text/javascript'>alert('로그인 먼저하세요');document.location.href="/login";</script>`);
    }
    else{
        connection.query(updateQuery, [title, content, postId], (error, results) => {
            if (error) {
                res.status(500).json({ success: false, message: '게시글 수정 실패' });
            } else {
                res.json({ success: true, message: '게시글 수정 성공' });
            }
        });
    }
});

// 게시글 삭제
app.delete('/posts/:id', (req, res) => {
    const postId = req.params.id;
    const deleteQuery = 'DELETE FROM posts WHERE id = ?';
    username=req.session.nickname;
    if(username === undefined){
        console.log('로그인 먼저하세요.');
        //res.send(`<script type='text/javascript'>alert('로그인 먼저하세요');document.location.href="/login";</script>`);
    }
    else{
        connection.query(deleteQuery, [postId], (error, results) => {
            if (error) {
                res.status(500).json({ success: false, message: '게시글 삭제 실패' });
            } else {
                res.json({ success: true, message: '게시글 삭제 성공' });
            }
        });
    }
});



// 로그인 화면
app.get('/login', function (request, response) {
    var title = '로그인';
    var html = template.HTML(title,`
            <h2>로그인</h2>
            <form action="/login_process" method="post">
            <p><input class="login" type="text" name="username" placeholder="아이디"></p>
            <p><input class="login" type="password" name="pwd" placeholder="비밀번호"></p>
            <p><input class="btn" type="submit" value="로그인"></p>
            </form>            
            <p>계정이 없으신가요?  <a href="/register">회원가입</a></p> 
        `, '');
    response.send(html);
});

// 로그인 프로세스
app.post('/login_process', function (request, response) {
    var username = request.body.username;
    var password = request.body.pwd;
    if (username && password) {             // id와 pw가 입력되었는지 확인
        
        connection.query('SELECT * FROM usertable WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {       // db에서의 반환값이 있으면 로그인 성공
                request.session.is_logined = true;      // 세션 정보 갱신
                request.session.nickname = username;
                request.session.save(function () {
                    response.redirect(`/`);
                });
            } else {              
                response.send(`<script type="text/javascript">alert("로그인 정보가 일치하지 않습니다."); 
                document.location.href="/login";</script>`);    
            }            
        });

    } else {
        response.send(`<script type="text/javascript">alert("아이디와 비밀번호를 입력하세요!"); 
        document.location.href="/login";</script>`);    
    }
});

// 로그아웃
app.get('/logout', function (request, response) {
    request.session.destroy(function (err) {
        response.redirect('/');
    });
});


// 회원가입 화면
app.get('/register', function(request, response) {
    var title = '회원가입';    
    var html = template.HTML(title, `
    <h2>회원가입</h2>
    <form action="/register_process" method="post">
    <p><input class="login" type="text" name="username" placeholder="아이디"></p>
    <p><input class="login" type="password" name="pwd" placeholder="비밀번호"></p>    
    <p><input class="login" type="password" name="pwd2" placeholder="비밀번호 재확인"></p>
    <p><input class="btn" type="submit" value="제출"></p>
    </form>            
    <p><a href="/login">로그인화면으로 돌아가기</a></p>
    `, '');
    response.send(html);
});
 
// 회원가입 프로세스
app.post('/register_process', function(request, response) {    
    var username = request.body.username;
    var password = request.body.pwd;    
    var password2 = request.body.pwd2;

    if (username && password && password2) {
        
        connection.query('SELECT * FROM usertable WHERE username = ?', [username], function(error, results, fields) { // DB에 같은 이름의 회원아이디가 있는지 확인
            if (error) throw error;
            if (results.length <= 0 && password == password2) {     // DB에 같은 이름의 회원아이디가 없고, 비밀번호가 올바르게 입력된 경우 
                connection.query('INSERT INTO usertable (username, password) VALUES(?,?)', [username, password], function (error, data) {
                    if (error) throw error2;
                    response.send(`<script type="text/javascript">alert("회원가입이 완료되었습니다!");
                    document.location.href="/";</script>`);
                });
            } else if (password != password2) {                     // 비밀번호가 올바르게 입력되지 않은 경우
                response.send(`<script type="text/javascript">alert("입력된 비밀번호가 서로 다릅니다."); 
                document.location.href="/register";</script>`);    
            }
            else {                                                  // DB에 같은 이름의 회원아이디가 있는 경우
                response.send(`<script type="text/javascript">alert("이미 존재하는 아이디 입니다."); 
                document.location.href="/register";</script>`);    
            }            
        });

    } else {        // 입력되지 않은 정보가 있는 경우
        response.send(`<script type="text/javascript">alert("입력되지 않은 정보가 있습니다."); 
        document.location.href="/register";</script>`);
    }
});





















const server = app.listen(port, () => {
    console.log(`Server is running on PORT ${port}`);
});
