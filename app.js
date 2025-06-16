const express = require("express"); // Adiciona o Express na sua aplicação
const session = require("express-session"); // Adiciona o gerencidor de sessões do Express
const sqlite3 = require("sqlite3"); // Adiciona a biblioteca para manipular arquivos do SQLite3
const { exec } = require('child_process');
const { error } = require("console");
const { stdout, stderr } = require("process");
const xss = require("xss"); // Biblioteca para evitar ataques XSS

// const bodyparser = require("body-parser"); // Versão do Express 4.x.z

// Função para sanitizar entradas e evitar scripts maliciosos
function cleanData(userInput) {
    return xss(userInput);
  }

const app = express(); // Armazena as chamadas e propriedades da biblioteca EXPRESS

const PORT = 3000; // Configura a porta TCP do Express

// Conexão com o banco de dados
const db = new sqlite3.Database("users.db");

db.serialize(() => {
    db.run(
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)"
    )
    db.run(
        "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, id_users INTEGER, titulo TEXT, conteudo TEXT, data_criacao TEXT)"
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

// Rota '/login' para o método GET /sobre
app.get("/login", (req, res) => {
    console.log("GET /login");

    res.render("pages/login", { titulo: "Login", req: req });
})

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

// Rota /login para procesamento dos dados do formulário de LOGIN no cliente
app.post("/login", (req, res) => {
    console.log("POST /login");
    console.log(JSON.stringify(req.body));
    const username = cleanData(req.body.username);
    const password = cleanData(req.body.password);
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
            req.session.id_username = row.id;
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
        const { titulo, conteudo } = req.body;
        const data_criacao = new Date();
        console.log("Data da criação: ", data_criacao, " Username: ", req.session.username,
            " id_username: ", req.session.id_username);

        // Criar a postagem com os dados coletados
        const query = "INSERT INTO posts (id_users, titulo, conteudo, data_criacao) VALUES (?, ?, ? ,?)"

        db.get(query, [req.session.id_username, titulo, conteudo, data_criacao], (err) => {
            if (err) throw err;
            res.send('Post criado');
        })
        //res.send("Criação de postagem... Em construção ...");

    } else {
        res.redirect("/invalid_user");
    }

})

app.get("/logout", (req, res) => {
    console.log("GET /logout");
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// Rota '/cadastro' para o método GET /cadastro
app.get("/cadastro", (req, res) => {
    console.log("GET /cadastro");
    res.render("pages/cadastro", { titulo: "Cadastro", req: req });
})

app.post("/cadastro", (req, res) => {
    console.log("POST /cadastro");
    console.log(JSON.stringify(req.body));
    const username = cleanData(req.body.username);
    const password = cleanData(req.body.password);

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
            const insert = "INSERT INTO users (username, password) VALUES (?,?)"
            db.get(insert, [username, password], (err, row) => {
                if (err) throw err;

                console.log(`Usuário: ${username} cadastrado com sucesso.`)
                res.redirect("/login"); // Redireciona para a página de login caso o registro tenha sucesso.
            })
        }
    })
    // res.render("pages/sobre");
})

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

const expressVersion = 5;

if (expressVersion == 5) {
    // Middleware para capturar rotas não existentes - Express >=5
    app.use('/{*erro}', (req, res) => {
        // Envia uma resposta de erro 404
        res.status(404).render('pages/404', { titulo: "ERRO 404", req: req });
    });
} else {
    // Middleware para capturar rotas não existentes - Express <= 4
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