import RNFS from "react-native-fs";
import RNRestart from "react-native-restart";

export const loadBundle = async (url) => {
  try {
    const path = RNFS.DocumentDirectoryPath + "/update.bundle";

    const download = await RNFS.downloadFile({
      fromUrl: url,
      toFile: path,
    }).promise;

    if (download.statusCode === 200) {
      console.log("Bundle downloaded successfully:", path);
      RNRestart.Restart(); // Restart to load new bundle
    } else {
      console.log(
        "Failed to download bundle, status code:",
        download.statusCode
      );
    }
  } catch (e) {
    console.log("Bundle download failed:", e);
  }
};