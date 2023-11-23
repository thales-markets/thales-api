require("dotenv").config();

const usersData = require("../assets/users-data.json");
const volumeData = require("../assets/volume-data.json");

async function getVolumeData() {
  return volumeData;
}

async function getUsersData() {
  return usersData;
}

module.exports = {
  getVolumeData,
  getUsersData,
};
