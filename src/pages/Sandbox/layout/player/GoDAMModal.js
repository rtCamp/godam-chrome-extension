import React from "react";
import ReactDOM from "react-dom";
import styles from "../../styles/player/_GoDAMModal.module.scss";

const Modal = ({ children }) => {
  return (
    <div className={styles.modal}>
      <div className={styles.overlay}></div>
      <div className={styles.modalContent}>{children}</div>
    </div>
  );
};

const GoDAMModal = (props) => {
  const { videoUrl = '', success, error } = props;

  return (
    <Modal>
        <div>
          <h1>Video Uploaded Successfully</h1>
          <p>
            Your video has been uploaded successfully. You can now download it
            from the link below.
          </p>
        </div>
    </Modal>
  );
};

export default GoDAMModal;
