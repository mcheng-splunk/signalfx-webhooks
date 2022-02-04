const express = require('express')
const router = express.Router()

const {
    circleci_handleWebhook,
    circleci_getworkflows,
    ping,
} = require('../controllers/circleci')

router.post("/ci-webhook", circleci_handleWebhook)
router.get("/ci-getworkflows", circleci_getworkflows)

router.get("/ci-ping", ping)
router.post("/ci-ping", ping)

module.exports = router