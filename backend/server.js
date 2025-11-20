const express = require("express");
const cors = require("cors");
const kycRoutes = require("./src/routes/kyc.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/kyc", kycRoutes);

app.listen(5000, () => console.log("Backend running on port 5000"));
