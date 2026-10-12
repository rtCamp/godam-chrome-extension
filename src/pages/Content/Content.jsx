import React, { useState, useContext, useEffect, useRef } from "react";

// Components
import Wrapper from "./Wrapper";

// Context
import ContentState from "./context/ContentState";

// Import styles raw to inject into light DOM
import lightDomStyles from "!raw-loader!sass-loader!./styles/_Content.scss";

const Content = () => {

  return (
    <div className="screenity-shadow-dom">
      <ContentState>
        <Wrapper />
      </ContentState>
      <style type="text/css">{lightDomStyles}</style>
    </div>
  );
};

export default Content;
