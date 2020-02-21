let express = require("express");
let router = express.Router();
let Client = require("node-rest-client").Client;
let endpoint = require("../config").endpoint;

// let redis = require('redis')
// let redisClient = redis.createClient(endpoint.redis)
const Redis = require("ioredis");
var redisClient;
if(endpoint.redis.sentinel){
    redisClient = new Redis({
        sentinels: [endpoint.redis],
        name: "mymaster"
    });
}else{
    redisClient = new Redis({
        host: endpoint.redis.host,
        port: endpoint.redis.post
    })
}


let client = new Client();
logger = msg => {
    let date = new Date();
    console.log(`[sam-blackberry-api] ${date.toGMTString()}-${msg}`);
};
client.registerMethod(
    "getContent",
    `${endpoint.cms}/api/content/\${page}`,
    "GET"
);
client.registerMethod(
    "getContentByCategory",
    `${endpoint.cms}/api/content/\${page}/\${category}/\${include}`,
    "GET"
);
client.registerMethod(
    "getBestByCategory",
    `${endpoint.cms}/api/best/\${category}`,
    "GET"
);
client.registerMethod("getOffering", `${endpoint.cms}/api/offering`, "GET");
client.registerMethod("login", `${endpoint.account}/api/login`, "POST");
client.registerMethod(
    "getUser",
    `${endpoint.account}/api/user/\${email}`,
    "GET"
);
client.registerMethod("updateUser", `${endpoint.account}/api/user`, "POST");

/* GET home page. */
router.get("/", function(req, res, next) {
    logger("called health check");
    res.status(200).send("index of api service");
});

router.post("/login", (req, res, next) => {
    logger(`login requested with..`);
    let args = {
        parameters: {
            userEmail: req.body.user_email,
            userPw: req.body.user_pw
        }
    };
    client.methods.login(args, (data, response) => {
        if (200 !== response.statusCode) {
            res.status(500).json(data);
        } else {
            logger(`login ${req.body.user_email}`);
            redisClient.set(`${data.userEmail}`, `${data.membership}`);
            res.cookie("private-token", data.userEmail, { httpOnly: true });

            res.status(200).json(data);
        }
    });
});

router.get("/logout", (req, res, next) => {
    logger("log out");
    res.status(200).json({
        status: "ok"
    });
});

router.get("/user/:email", (req, res, next) => {
    logger(`get user by ${req.params.email}`);
    let args = {
        path: { email: req.params.email }
    };
    client.methods.getUser(args, (data, response) => {
        if (500 == response.statusCode) {
            res.status(500).json(data);
        } else {
            logger(`get user info of ${req.params.email}`);
            res.status(200).json(data);
        }
    });
});
router.post("/user", (req, res, next) => {
    logger(`update user for ${req.params.email}`);
    let args = {
        parameters: {
            userEmail: req.body.user_email,
            userTel: req.body.user_tel,
            userNickName: req.body.user_nickname
        }
    };
    client.methods.updateUser(args, (data, response) => {
        if (500 == response.statusCode) {
            res.status(500).json(data);
        } else {
            logger(`get user info of ${req.params.email}`);
            res.status(200).json(data);
        }
    });
});

router.get("/content/:page", (req, res, next) => {
    let args = {
        path: { page: req.params.page }
    };
    client.methods.getContent(args, (data, response) => {
        if (500 == response.statusCode) {
            res.status(500).json(data);
        } else {
            logger(`get ${data.length} data of ${req.params.category}`);
            res.status(200).json(data);
        }
    });
});
router.get("/content/:page/:category/:include", (req, res, next) => {
    let args = {
        path: {
            page: req.params.page,
            category: req.params.category,
            include: req.params.include
        }
    };
    client.methods.getContentByCategory(args, (data, response) => {
        if (500 == response.statusCode) {
            res.status(500).json(data);
        } else {
            logger(`get ${data.length} data of ${req.params.category}`);
            res.status(200).json(data);
        }
    });
});
router.get("/content/:page/:category", (req, res, next) => {
    let args = {
        path: {
            page: req.params.page,
            category: req.params.category,
            include: true
        }
    };
    client.methods.getContentByCategory(args, (data, response) => {
        if (500 == response.statusCode) {
            res.status(500).json(data);
        } else {
            logger(`get ${data.length} data of ${req.params.category}`);
            res.status(200).json(data);
        }
    });
});
router.get("/best/:category", (req, res, next) => {
    let args = {
        path: { category: req.params.category }
    };
    client.methods.getBestByCategory(args, (data, response) => {
        if (500 == response.statusCode) {
            res.status(500).json(data);
        } else {
            logger(
                `get ${data.length} best recommand of ${req.params.category}`
            );
            res.status(200).json(data);
        }
    });
});
router.get("/offering", (req, res, next) => {
    console.log("+==================+");

    redisClient.get(`${req.cookies["private-token"]}`, (err, result) => {
        logger(`token: ${result} by ${req.cookies["private-token"]}`);

        let args = {};
        if (!!result) {
            args = {
                headers: { membership: "vip" }
            };
            logger("vip traffic");
        }
        client.methods.getOffering(args, (data, response) => {
            if (500 == response.statusCode) {
                res.status(500).json(data);
            } else {
                logger(`get ${data.length} offering data`);
                res.status(200).json(data);
            }
        });
    });
});
module.exports = router;
