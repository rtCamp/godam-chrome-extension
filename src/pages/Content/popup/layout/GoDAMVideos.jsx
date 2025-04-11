import React, { useEffect } from 'react'

import { GoDAMLogo } from "../../images/popup/images";

import "../styles/layout/_GoDAMVideos.scss";

const GoDAMVideos = () => {

  const redirectLink = 'https://frappe-transcoder-api.rt.gw/godam-core/media-library';

  useEffect(() => {
    // Redirect to the GoDAM website
    window.open(redirectLink, "_blank");
  }, []);

  return (
    <div className="GoDAMVideos">
        <a href={redirectLink} target="_blank" className="GoDAMLink"
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            margin: '24px auto',
            cursor: 'pointer',
          }}
        >
            <img src={GoDAMLogo} alt="GoDAM Logo"
              style={{
                width: '70%',
                objectFit: 'contain',
              }}
            />
        </a>
    </div>
  );
};

export default GoDAMVideos