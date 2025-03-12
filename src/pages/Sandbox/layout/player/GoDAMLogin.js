import React, { useState } from "react";
import ReactDOM from "react-dom";
import styles from "../../styles/player/_GoDAMLogin.module.scss";
import axios from "axios";
const URL =
  "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/assets/";

const instance = axios.create({
    baseURL: 'https://frappe-transcoder-api.rt.gw', 
    withCredentials: true,  // Enables cookies in requests
});

// const Modal = ( { children } ) => {
//     console.log(document.getElementById( 'godam-portal' ));

//     return ReactDOM.createPortal(
// 		<>
// 			{ children }
// 		</>,
// 		document.getElementById( 'godam-portal' ),
// 	);
// };

const Modal = ({ children }) => {
  return (
    <div className={styles.modal}>
      <div className={styles.overlay}></div>
      <div className={styles.modalContent}>{children}</div>
    </div>
  );
};

const GoDAMLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async(e) => {
        e.preventDefault();

        setLoading(true);

        try {
            const response = await instance.post('/api/method/login', {
                usr: username,
                pwd: password,
            });

            // 🔹 Print all headers
            console.log('Response Headers:', response.headers);

            // 🔹 Access cookies from headers (Browser Restriction: Set-Cookie might not be visible)
            const setCookieHeader = response.headers['set-cookie'];
            console.log('Set-Cookie Header:', setCookieHeader);
        }
        catch (error) {
            setError("Invalid username or password");
        }
        finally {
            setLoading(false);
        }
    };

  return (
    <div className={styles.modal}>
      <div className={styles.overlay}></div>
      <div className={styles.modalContent}>
        <form className={styles.godamLoginForm} onSubmit={handleSubmit}>
          <h2>Sign In</h2>
          <div className={styles.godamLogo}>
            <img
              className={styles.img}
              src={URL + "editor/icons/godam-logo.png"}
              alt="GoDAM"
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formGroup}>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <button
              className={styles.godamBtnPrimary}
              disabled={loading}
              onClick={handleSubmit}
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoDAMLogin;
