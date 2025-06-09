const express = require("express"); // Adiciona o Express na sua aplicação
const session = require("express-session"); // Adiciona o gerencidor de sessões do Express
const sqlite3 = require("sqlite3"); // Adiciona a biblioteca para manipular arquivos do SQLite3
const { exec } = require('child_process');
const { error } = require("console");
const { stdout, stderr } = require("process");

// const bodyparser = require("body-parser"); // Versão do Express 4.x.z

const app = express(); // Armazena as chamadas e propriedades da biblioteca EXPRESS

const PORT = 3000; // Configura a porta TCP do Express

// Conexão com o banco de dado
const db = new sqlite3.Database("users.db");

db.serialize(() => {
    db.run(
        "CREATE TABLE IF NOT EXISTS users (id_user INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, role TEXT)"
    )
    db.run(
        "CREATE TABLE IF NOT EXISTS posts (id_post INTEGER PRIMARY KEY AUTOINCREMENT, id_users INTEGER, title TEXT, ingredients TEXT, howToMake TEXT, dateCreated TEXT)"
    )
});

app.use(
    session({
        secret: "senhaforte",
        resave: true,
        saveUninitialized: true,
    })
);

// Configura a rota '/static' para a pasta `__dirname/static` do seu servidor 
app.use('/static', express.static(__dirname + '/static'));

// Configuraçãodo Expressa para processar requisições POST com BODY PARAMETERS
// app.use(bodyparser.urlencoded({extended: true})); // Versão Express <=4.x.x
app.use(express.urlencoded({ extended: true })); // Versão Express >= 5.x.x

app.set('view engine', 'ejs'); // Habilita a 'view engine' para usar o 'ejs'

// Rota '/' (raiz) para o método GET /
app.get("/", (req, res) => {
    console.log("GET /")
    // res.send("Alô SESI Sumaré<br>Bem-vindos ao SENAI Sumaré.");
    // res.send("<img src='./static/senai_logo.jfif' />");
    res.render("pages/index", { titulo: "Index", req: req });
})

// Rota '/sobre' para o método GET /sobre
app.get("/sobre", (req, res) => {
    console.log("GET /sobre");
    res.render("pages/sobre", { titulo: "Sobre", req: req });
})

app.get("/cadastro", (req, res) => {
    console.log("GET /cadastro");
    res.render("pages/cadastro", { titulo: "Cadastro", req: req });
})

app.post("/cadastro", (req, res) => {
    console.log("POST /cadastro");
    console.log(JSON.stringify(req.body));
    const { username, password, role } = req.body;

    const query = "SELECT * FROM users WHERE username=?"

    db.get(query, [username], (err, row) => {
        if (err) throw err;

        // 1. Verificar se o usuário existe
        console.log("Query SELECT do cadastro:", JSON.stringify(row));
        if (row) {
            // 2. Se o usuário existir avisa o usuário que não é possível realizar o cadastro
            console.log(`Usuário: ${username} já cadastrado.`);
            // res.send("Usuário já cadastrado");
            res.redirect("/register_failed");
        } else {
            // 3. Se não existir, executar processo de cadastro do usuário
            const insert = "INSERT INTO users (username, password, role) VALUES (?,?,?)"
            db.get(insert, [username, password, role], (err, row) => {
                if (err) throw err;
                console.log(`Usuário: ${username} cadastrado com sucesso.`)
                res.redirect("/login"); // Redireciona para a página de login caso o registro tenha sucesso.
            })
        }
    })
    // res.render("pages/sobre");
})

// Rota '/login' para o método GET /sobre
app.get("/login", (req, res) => {
    console.log("GET /login");

    res.render("pages/login", { titulo: "Login", req: req });
})

// Rota /login para procesamento dos dados do formulário de LOGIN no cliente
app.post("/login", (req, res) => {
    console.log("POST /login");
    console.log(JSON.stringify(req.body));
    const { username, password } = req.body;
    const query = "SELECT * FROM users WHERE username=? AND password=?"
    db.get(query, [username, password], (err, row) => {
        if (err) throw err;

        // 1. Verificar se o usuário existe
        console.log(JSON.stringify(row));
        if (row) {
            console.log("SELECT da tabela users: ", row);
            // 2. Se o usuário existir e a senha é válida no BD, executar processo de login
            req.session.loggedin = true;
            req.session.username = username;
            req.session.id_username = row.id_user;
            req.session.role = row.role
            res.redirect("/dashboard");
        } else {
            // 3. Se não, executar processo de negação de login
            res.redirect("/invalid_user");
            //res.send("Usuário inválido");
        }
    })
    // res.render("pages/sobre");
})


app.get("/post_create", (req, res) => {
    console.log("GET /post_create");
    // Verificar se o usuário está logado
    if (req.session.loggedin) {
        // Se estiver logado, envie o formulário para criação do Post
        res.render("pages/post_form", { titulo: "Criar postagem", req: req });
    } else {
        // Se não estiver logado, redirect para /invalid_user
        res.redirect("/invalid_user");
    }
});

app.post("/post_create", (req, res) => {
    console.log("POST /post_create");
    // Pegar dados da postagem: UserID, Titulo Postagem, Conteúdo da postagem, Data da postagem
    // req.session.username, req.session.id_username
    if (req.session.loggedin) {
        console.log("Dados da postagem: ", req.body);
        const { title, ingredients, howToMake } = req.body;
        const data_criacao = new Date();
        const dateConv = data_criacao.toLocaleDateString();
        console.log("Data da criação: ", dateConv, 
                    " Username: ", req.session.username,
                    " id_username: ", req.session.id_username);

        // Criar a postagem com os dados coletados
        const query = "INSERT INTO posts (id_users, title, ingredients, howToMake, dateCreated) VALUES (?, ?, ? ,?,?)"

        db.get(query, [req.session.id_username, title, ingredients, howToMake, dateConv], (err) => {
            if (err) throw err;
            res.render("pages/post_createSuccess", { titulo: "Post criado", req: req });
        })
    } else {
        res.redirect("/invalid_user");
    }

})

app.get("/postVisualizer/:id", (req, res) =>{
    const postID = req.params.id;
    const query = `
            SELECT posts.*, users.username
            FROM posts
            JOIN users ON posts.id_users = users.id_user
            WHERE posts.id_post = ?`;

            db.get(query, [postID], (err, row) =>{
                if(err) {
                    console.error("Erro ao buscar post:", err);
                    return res.status(500).render('pages/error', {
                        message: "Erro ao buscar post",
                        error: err
                    });
                }

                if(!row){
                    return res.status(404).render('pages/error', {
                        message: "Post não encontrado",
                        error: {status: 404}
                    })
                }
                res.render("pages/postVisualizer", {
                    titulo: row.title,
                    dados: row,
                    req:res
                })
            })
})

app.get("/logout", (req, res) => {
    console.log("GET /logout");
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// Rota '/dashboard' para o método GET /dashboard
app.get("/dashboard", (req, res) => {
    console.log("GET /dashboard")

    if (req.session.loggedin) {
        // Listar todos os usuários
        const query = "SELECT * FROM users";
        db.all(query, [], (err, row) => {
            if (err) throw err;
            console.log(JSON.stringify(row));
            // Renderiza a página dashboard com a lista de usuário coletada do BD pelo SELECT
            res.render("pages/dashboard", { titulo: "Tabela de usuário", dados: row, req: req });
        });
    } else {
        // res.send("Usuário não logado");
        res.redirect("/invalid_user");
    }
});

app.get("/posts", (req, res) => {
    console.log("GET /posts")
        const query = "SELECT * FROM posts LEFT JOIN users ON users.id_user = posts.id_users";
        db.all(query, [], (err, row) => {
            if (err) throw err;
            console.log(JSON.stringify(row));
            res.render("pages/posts", { titulo: "Postagens", dados: row, req: req });
        });
});

// Rota '/post_list_user' para o método GET /post_list_user
// Lista as posatgens por usuário no dashboard do usuário
app.get("/post_list_user", (req, res) => {
    console.log("GET /post_list_user")

    if (req.session.loggedin) {
        // Listar todos os usuários
        const query = "SELECT * FROM users";
        db.get(query, [username], (err, row) => {
            if (err) throw err;
            console.log(JSON.stringify(row));
            // Renderiza a página dashboard com a lista de usuário coletada do BD pelo SELECT
            res.render("pages/dashboard", { titulo: "Tabela de usuário", dados: row, req: req });
        });
    } else {
        // res.send("Usuário não logado");
        res.redirect("/invalid_user");
    }
});

app.get("/invalid_user", (req, res) => {
    console.log("GET /invalid_user");
    res.render("pages/invalid_user", { titulo: "Usuário não logado", req: req });
})

app.get("/register_failed", (req, res) => {
    console.log("GET /register_failed");
    res.render("pages/register_failed", { titulo: "Usuário já cadastrado", req: req });
})

app.get("/register_ok", (req, res) => {
    console.log("GET /register_ok");
    res.render("pages/register_ok", { titulo: "Usuário cadastrado com sucesso", req: req });
})

const expressVersion = 5;

if (expressVersion == 5) {
    // Middleware para capturar rotas não existentes - Express >=5
    app.use('/{*erro}', (req, res) => {
        // Envia uma resposta de erro 404
        res.status(404).render('pages/404', { titulo: "ERRO 404", req: req });
    });
} else {
    // Middleware para capturar rotas não exi\stentes - Express <= 4
    app.use("*", (req, res) => {
        // Envia uma resposta de erro 404
        console.log("GET - ERRO 404")
        res.status(404).render('pages/404', { titulo: "ERRO 404", req: req });
    });
}

app.listen(PORT, () => {
    console.log(`Servidor sendo executado na porta ${PORT}`);
    console.log(__dirname + "\\static");
});