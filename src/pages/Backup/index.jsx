import React from "react";
import { render } from "react-dom";
import "../../styles/tailwind.scss";

import Backup from "./Backup";

// Render at the end of the body of any website
render(<Backup />, window.document.querySelector("#app-container"));

if (module.hot) module.hot.accept();
