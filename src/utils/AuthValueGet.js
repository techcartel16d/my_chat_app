import { getObject, getString } from "../utils/mmkvStorage"

const user = getObject("user")
const token = getString("token")
const socketId = getString("socketId")



const authValue = {
    userId: user.id,
    token: token,
    sokectId:socketId
}

export {
    authValue
}