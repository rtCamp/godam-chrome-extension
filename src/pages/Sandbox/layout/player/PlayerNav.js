import React, { useContext, useRef, useEffect, useState } from "react";
import styles from "../../styles/player/_Nav.module.scss";
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

// Icons
import { ReactSVG } from "react-svg";

const URL = "/assets/";

const StarIcon = URL + "editor/icons/help-nav.svg";
const HeartIcon = URL + "editor/icons/heart.svg";

const PlayerNav = () => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  const contentStateRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false); // State for dropdown
  const dropdownRef = useRef(null); // Ref for dropdown (for click outside detection)

  useEffect(() => {
    contentStateRef.current = contentState;
  }, [contentState]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle dropdown
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Handle logout
  const handleLogout = () => {
    chrome.runtime.sendMessage({ type: "sign-out-godam" });
    setContentState((prevContentState) => ({
      ...prevContentState,
      godamEnabled: false,
      userInfo: null
    }));
    setDropdownOpen(false);
  };

  return (
    <div className={styles.nav}>
      <div className={styles.navWrap}>
        <div
          onClick={() => {
            chrome.runtime.sendMessage({ type: "open-home" });
          }}
          aria-label="home"
          className={styles.navLeft}
        >
          <div className={styles.godamLogo}>
            <img src={URL + "editor/icons/godam-logo.png"} alt="GoDAM Logo" />
            <span>Powered by Screenity</span>
          </div>
        </div>
        <div className={styles.navRight}>
          <button
            className="button simpleButton godamButton"
            href="https://godam.io/docs"
          >
            <ReactSVG src={StarIcon} />
            {chrome.i18n.getMessage("getHelpNav")}
          </button>
          
          {/* User button with dropdown - only show when logged in */}
          {contentState.godamEnabled && (
            <div className={styles.userDropdownContainer} ref={dropdownRef}>
              <button 
                aria-label="user" 
                className="button simpleButton godamButton"
                onClick={toggleDropdown}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-person-circle" viewBox="0 0 16 16">
                  <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
                  <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
                </svg>
              </button>
              
              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {contentState.userInfo && (
                    <div className={styles.userInfo}>
                      <span className={styles.username}>{contentState.userInfo.username}</span>
                    </div>
                  )}
                  <div 
                    className={styles.dropdownItem} 
                    onClick={handleLogout}
                  >
                    Sign out
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerNav;
