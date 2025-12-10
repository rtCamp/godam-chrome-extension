import React from "react";
import { render } from "react-dom";
import "../../styles/tailwind.scss";

import Camera from "./Camera";

// Render at the end of the body of any website
render(<Camera />, window.document.querySelector("#app-container"));

if (module.hot) module.hot.accept();
