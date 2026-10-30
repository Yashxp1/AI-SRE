import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("hello from agent");
});

app.listen(4242, () => {
  console.log("Agent is running");
});
