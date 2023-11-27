const axios = require('axios')

function dingTalk(msg) {
    axios.post("http://127.0.0.1:8888/ding", msg)
        .then(res => {
            console.log(msg)
        }).catch(err => {
        console.log(err);
    })
}

function tgTalk(msg) {
    axios.post("http://127.0.0.1:8888/tg_arb", msg)
        .then(res => {
            console.log(msg)
        }).catch(err => {
        console.log(err);
    })
}

module.exports = {dingTalk, tgTalk}