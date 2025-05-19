const express = require("express"); // Adiciona o Express na sua aplicação
const session = require("express-session"); // Adiciona o gerencidor de sessões do Express
const sqlite3 = require("sqlite3"); // Adiciona a biblioteca para manipular arquivos do SQLite3
// const bodyparser = require("body-parser"); // Versão do Express 4.x.z

const app = express(); // Armazena as chamadas e propriedades da biblioteca EXPRESS

const PORT = 3000; // Configura a porta TCP do Express

// Conexão com o banco de dados
const db = new sqlite3.Database("users.db");

db.serialize(() => {
    db.run(
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)"
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
    res.render("pages/index", { titulo: "Index" , req: req });
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
            // 2. Se o usuário existir e a senha é válida no BD, executar processo de login
            req.session.loggedin = true;
            req.session.username = username;
            res.redirect("/dashboard");
        } else {
            // 3. Se não, executar processo de negação de login
            res.redirect("/cadastro");
            //res.send("Usuário inválido");
        }
    })
    // res.render("pages/sobre");
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
    res.render("pages/cadastro", { titulo: "Cadastro" });
})

app.post("/cadastro", (req, res) => {
    console.log("POST /cadastro");
    console.log(JSON.stringify(req.body));
    const { username, password } = req.body;

    const query = "SELECT * FROM users WHERE username=?"

    db.get(query, [username], (err, row) => {
        if (err) throw err;

        // 1. Verificar se o usuário existe
        console.log("Query SELECT do cadastro:", JSON.stringify(row));
        if (row) {
            // 2. Se o usuário existir avisa o usuário que não é possível realizar o cadastro
            console.log(`Usuário: ${username} já cadastrado.`);
            res.send("Usuário já cadastrado");
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
            res.render("pages/dashboard", { titulo: "Tabela de usuário", dados: row });
        });
    } else {
        res.send("Usuário não logado");
    }
});

app.listen(PORT, () => {
    console.log(`Servidor sendo executado na porta ${PORT}`);
    console.log(__dirname + "\\static");
});