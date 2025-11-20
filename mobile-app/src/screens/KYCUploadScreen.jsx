import React, { useState } from "react";
import { View, Text, Button } from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "../../services/api";

export default function KYCUploadScreen() {
  const [ocrText, setOcrText] = useState("");
  const [faceScore, setFaceScore] = useState("");
  const [liveness, setLiveness] = useState("");

  const pickDocument = async () => {
    const doc = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!doc.cancelled) {
      const form = new FormData();
      form.append("document", { uri: doc.uri, type: "image/jpeg", name: "doc.jpg" });
      const res = await axios.post("/kyc/upload-document", form, { headers: { "Content-Type": "multipart/form-data" } });
      setOcrText(res.data.ocrText);
    }
  };

  const pickSelfieAndId = async () => {
    const selfie = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    const idPhoto = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!selfie.cancelled && !idPhoto.cancelled) {
      const form = new FormData();
      form.append("selfie", { uri: selfie.uri, type: "image/jpeg", name: "selfie.jpg" });
      form.append("idPhoto", { uri: idPhoto.uri, type: "image/jpeg", name: "id.jpg" });

      const res = await axios.post("/kyc/face-verify", form, { headers: { "Content-Type": "multipart/form-data" } });
      setFaceScore(res.data.matchScore);

      const liveForm = new FormData();
      liveForm.append("selfie", { uri: selfie.uri, type: "image/jpeg", name: "selfie.jpg" });
      const liveRes = await axios.post("/kyc/liveness-check", liveForm, { headers: { "Content-Type": "multipart/form-data" } });
      setLiveness(liveRes.data.liveness);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button title="Upload Document" onPress={pickDocument} />
      <Text>OCR Text: {ocrText}</Text>

      <Button title="Upload Selfie & ID" onPress={pickSelfieAndId} />
      <Text>Face Match Score: {faceScore}</Text>
      <Text>Liveness: {liveness}</Text>
    </View>
  );
}
