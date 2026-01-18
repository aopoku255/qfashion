const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const csrf = require("csurf");
const path = require("path");
const router = require("./src/routes/routes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("short"));

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(cookieParser());

app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const csrfProtection = csrf({
  cookie: false,
});

app.use(helmet());
app.use("/api", router);

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`APP RUNNING ON PORT: ${PORT}`));
