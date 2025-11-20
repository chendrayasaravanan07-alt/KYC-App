import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:5000", // change to your backend IP for phone
});

export default instance;
