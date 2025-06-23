import React, { useEffect } from 'react'

import { GoDAMLogo } from "../../images/popup/images";

import "../styles/layout/_GoDAMVideos.scss";

const GoDAMVideos = () => {

  const baseUrl = process.env.GODAM_BASE_URL || 'https://app.godam.io';

  const redirectLink = `${baseUrl}/web/media-library`;

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