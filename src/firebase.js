import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 1. Crie um projeto em https://console.firebase.google.com
// 2. Ative Firestore Database (pode ser em modo produção, veja as regras
//    de segurança no README).
// 3. Em "Configurações do projeto" → "Seus apps" → Web app, copie o
//    config abaixo e cole os valores reais aqui.
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
