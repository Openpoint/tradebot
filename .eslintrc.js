module.exports = {
    "env": {
        "browser": true,
        "node": true,
        "es6":true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "module"
    },
    "rules": {
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ]
    },
    "globals":{
        "__rootdir":true,
        "Promise":true,
        "io":true,
        "echarts":true,
        "tb_encoding":true,
        "tb_time":true,
        "tb_money":true,
        "define":true
    }
};