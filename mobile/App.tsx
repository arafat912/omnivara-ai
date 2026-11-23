import React, { useEffect, useState } from "react";
import {
  SafeAreaView, StatusBar, Text, TextInput, Pressable, View,
  ScrollView, StyleSheet, Alert, ActivityIndicator, Image
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from "expo-secure-store";
import * as Speech from "expo-speech";
import Voice, { SpeechErrorEvent, SpeechResultsEvent } from "@react-native-voice/voice";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://omnivara-api.onrender.com").replace(/\/$/, "");
type Chat = { id: number; title: string; messages?: { id:number; role:"user"|"assistant"; content:string }[] };
type ChatMessage = { role:"user"|"assistant"; content:string };
type SelectedImage = { uri:string; base64:string; mimeType:string };

export default function App() {
  const [token,setToken] = useState("");
  const [restoring,setRestoring] = useState(true);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [registerMode,setRegisterMode] = useState(false);
  const [chats,setChats] = useState<Chat[]>([]);
  const [activeId,setActiveId] = useState<number|null>(null);
  const [message,setMessage] = useState("");
  const [messages,setMessages] = useState<ChatMessage[]>([]);
  const [busy,setBusy] = useState(false);
  const [listening,setListening] = useState(false);
  const [selectedImage,setSelectedImage] = useState<SelectedImage|null>(null);
  const [memories,setMemories] = useState<{id:number;content:string}[]>([]);
  const [memoryDraft,setMemoryDraft] = useState("");
  const [showMemory,setShowMemory] = useState(false);
  const [webSearch,setWebSearch] = useState(false);

  async function request(path:string, options:RequestInit = {}, auth=true) {
    const headers:Record<string,string> = {"Content-Type":"application/json"};
    if(auth && token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_URL}/api/v1${path}`,{...options,headers});
    if(!response.ok) {
      const data = await response.json().catch(()=>({}));
      throw new Error(data.detail || "Request failed");
    }
    if(response.status===204) return null;
    return response.json();
  }

  useEffect(() => {
    Voice.onSpeechResults = (event:SpeechResultsEvent) => {
      const transcript = event.value?.[0];
      if(transcript) setMessage(current => current ? `${current} ${transcript}` : transcript);
      setListening(false);
    };
    Voice.onSpeechError = (_event:SpeechErrorEvent) => {
      setListening(false);
      Alert.alert("Voice input", "কথা বুঝতে সমস্যা হয়েছে। আবার চেষ্টা করুন এবং Microphone permission চালু রাখুন।");
    };
    return () => {
      Speech.stop();
      Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => undefined);
    };
  }, []);

  async function startVoiceInput() {
    if(listening) {
      try { await Voice.stop(); } catch {}
      setListening(false);
      return;
    }
    try {
      await Voice.start("bn-BD");
      setListening(true);
    } catch {
      setListening(false);
      Alert.alert("Voice unavailable", "এই Android build-এ voice recognition চালু করা যায়নি। Microphone permission দিন এবং অ্যাপটি পুনরায় build করুন।");
    }
  }

  async function copyMessage(text:string) {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("Copied!", "লেখাটি কপি হয়েছে।");
    } catch {
      Alert.alert("Copy failed", "আবার চেষ্টা করুন।");
    }
  }

  function speakReply(text:string) {
    Speech.stop();
    Speech.speak(text, { language:"bn-BD", rate:0.92, onError:() => Alert.alert("Audio", "এই ডিভাইসে বাংলা voice পাওয়া যায়নি।") });
  }

  useEffect(() => {
    SecureStore.getItemAsync("omnivara_access_token")
      .then(saved => { if (saved) setToken(saved); })
      .catch(() => Alert.alert("Session", "Could not restore the saved session. Please log in again."))
      .finally(() => setRestoring(false));
  }, []);

  useEffect(()=> {
    if(!token) return;
    request("/conversations")
      .then(setChats)
      .catch(e=>Alert.alert("History",e.message));
  },[token]);

  async function authenticate() {
    if(!email.trim() || password.length<8) {
      Alert.alert("Check details","Enter a valid email and password with at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const data = await request(registerMode?"/auth/register":"/auth/login",{
        method:"POST",body:JSON.stringify({email,password})
      },false);
      await SecureStore.setItemAsync("omnivara_access_token",data.access_token);
      setToken(data.access_token);
      setPassword("");
    } catch(e) {
      Alert.alert("Sign-in failed",e instanceof Error?e.message:"Try again");
    } finally { setBusy(false); }
  }

  async function openChat(id:number) {
    try {
      const data=await request(`/conversations/${id}`);
      setActiveId(id);
      setMessages(data.messages||[]);
    } catch(e) {
      Alert.alert("Could not open chat",e instanceof Error?e.message:"Try again");
    }
  }

  async function logout() {
    await SecureStore.deleteItemAsync("omnivara_access_token");
    setToken("");
    setChats([]);
    setMessages([]);
    setActiveId(null);
  }

  async function loadMemories() {
    try {
      setMemories(await request("/memories"));
    } catch(e) {
      Alert.alert("Memory",e instanceof Error?e.message:"Could not load saved memories");
    }
  }

  async function addMemory() {
    const content=memoryDraft.trim();
    if(!content) return;
    try {
      await request("/memories",{method:"POST",body:JSON.stringify({content})});
      setMemoryDraft("");
      await loadMemories();
      Alert.alert("Memory saved","এই তথ্যটি আপনার অ্যাকাউন্টে সংরক্ষিত হয়েছে।");
    } catch(e) {
      Alert.alert("Memory",e instanceof Error?e.message:"Could not save memory");
    }
  }

  async function removeMemory(id:number) {
    try {
      await request(`/memories/${id}`,{method:"DELETE"});
      setMemories(current=>current.filter(item=>item.id!==id));
    } catch(e) {
      Alert.alert("Memory",e instanceof Error?e.message:"Could not delete memory");
    }
  }

  async function chooseImage() {
    if(busy) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted) {
        Alert.alert("অনুমতি প্রয়োজন","ছবি নির্বাচন করতে Photos/Gallery permission দিন।");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        base64: true,
        quality: 0.7,
      });
      if(result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if(!asset.base64) {
        Alert.alert("ছবি পড়া যায়নি","আবার একটি ছবি নির্বাচন করুন।");
        return;
      }
      const mimeType = asset.mimeType || "image/jpeg";
      if(!["image/jpeg","image/png","image/webp"].includes(mimeType)) {
        Alert.alert("অসমর্থিত ছবি","JPG, PNG অথবা WEBP ছবি নির্বাচন করুন।");
        return;
      }
      if(asset.base64.length > 7000000) {
        Alert.alert("ছবি অনেক বড়","৫ MB-এর কম সাইজের ছবি নির্বাচন করুন।");
        return;
      }
      setSelectedImage({uri:asset.uri,base64:asset.base64,mimeType});
    } catch(e) {
      Alert.alert("ছবি নির্বাচন ব্যর্থ",e instanceof Error?e.message:"আবার চেষ্টা করুন।");
    }
  }

  async function send() {
    const value=message.trim() || (selectedImage ? "এই ছবিটি বিশ্লেষণ করুন।" : "");
    if((!value&&!selectedImage)||busy) return;
    setBusy(true);
    setMessage("");
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setMessages(v=>[...v,{role:"user",content:imageToSend?`${value} 📷 ছবি সংযুক্ত` : value}]);
    try {
      const data=await request("/chat",{
        method:"POST",
        body:JSON.stringify({message:value,language:"auto",conversation_id:activeId,image_data:imageToSend?`data:${imageToSend.mimeType};base64,${imageToSend.base64}`:null,web_search:webSearch})
      });
      setActiveId(data.conversation_id);
      setMessages(v=>[...v,{role:"assistant",content:data.reply}]);
      setChats(await request("/conversations"));
    } catch(e) {
      if(imageToSend) setSelectedImage(imageToSend);
      Alert.alert("Message failed",e instanceof Error?e.message:"Try again");
    } finally { setBusy(false); }
  }

  if(restoring) return <SafeAreaView style={s.root}><ActivityIndicator color="#d6b66d" /></SafeAreaView>;

  if(!token) return <SafeAreaView style={s.root}>
    <StatusBar barStyle="light-content"/>
    <Text style={s.brand}>◉ OMNIVARA</Text>
    <Text style={s.tag}>INTELLIGENCE WITHOUT LIMITS</Text>
    <Text style={s.heading}>{registerMode?"Create account":"Welcome back"}</Text>
    <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor="#929cab" style={s.input}/>
    <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password (8+ characters)" placeholderTextColor="#929cab" style={s.input}/>
    <Pressable onPress={authenticate} disabled={busy} style={s.button}>
      <Text style={s.buttonText}>{busy?"Please wait…":registerMode?"Create account":"Log in"}</Text>
    </Pressable>
    <Pressable onPress={()=>setRegisterMode(v=>!v)}>
      <Text style={s.link}>{registerMode?"Already registered? Log in":"New here? Create an account"}</Text>
    </Pressable>
    <Text style={s.note}>API: {API_URL}</Text>
  </SafeAreaView>;

  return <SafeAreaView style={s.root}>
    <StatusBar barStyle="light-content"/>
    <View style={s.header}>
      <Text style={s.brand}>◉ OMNIVARA</Text>
      <View style={{flexDirection:"row",alignItems:"center"}}>
        <Pressable onPress={()=>{setShowMemory(v=>!v);if(!showMemory)loadMemories();}}>
          <Text style={s.link}>🧠 Memory</Text>
        </Pressable>
        <Pressable onPress={logout}><Text style={s.link}>Log out</Text></Pressable>
      </View>
    </View>
    {showMemory&&<View style={s.memoryPanel}>
      <Text style={s.gold}>SAVED MEMORY</Text>
      <TextInput value={memoryDraft} onChangeText={setMemoryDraft} placeholder="যে তথ্য ভবিষ্যতে মনে রাখতে চান লিখুন..." placeholderTextColor="#929cab" style={s.input}/>
      <Pressable onPress={addMemory} style={s.button}><Text style={s.buttonText}>মেমোরি সংরক্ষণ করুন</Text></Pressable>
      <ScrollView style={{maxHeight:130,marginTop:8}}>
        {memories.map(item=><View key={item.id} style={s.memoryRow}>
          <Text style={[s.reply,{flex:1,fontSize:13}]}>{item.content}</Text>
          <Pressable onPress={()=>removeMemory(item.id)}><Text style={s.link}>মুছুন</Text></Pressable>
        </View>)}
        {memories.length===0&&<Text style={s.voiceHint}>এখনো কোনো মেমোরি সংরক্ষণ করা হয়নি।</Text>}
      </ScrollView>
    </View>}
    <ScrollView horizontal style={{maxHeight:54,flexGrow:0}} contentContainerStyle={{gap:8,alignItems:"center"}}>
      <Pressable style={s.chatChip} onPress={()=>{setActiveId(null);setMessages([]);}}>
        <Text style={s.buttonText}>+ New chat</Text>
      </Pressable>
      {chats.map(c=><Pressable key={c.id} style={s.chatChip} onPress={()=>openChat(c.id)}>
        <Text style={s.buttonText}>{c.title.slice(0,22)}</Text>
      </Pressable>)}
    </ScrollView>
    <ScrollView style={{flex:1}} contentContainerStyle={{paddingVertical:18}}>
      {messages.length===0&&<Text style={s.heading}>How can I help you today?</Text>}
      {messages.map((m,i)=><View key={i} style={s.card}>
        <Text style={s.gold}>{m.role==="assistant"?"OMNIVARA":"YOU"}</Text>
        <Text style={s.reply} selectable>{m.content}</Text>
        <Pressable onPress={()=>copyMessage(m.content)} style={s.listenButton}>
          <Text style={s.link}>📋 কপি করুন</Text>
        </Pressable>
        {m.role==="assistant"&&<Pressable onPress={()=>speakReply(m.content)} style={s.listenButton}>
          <Text style={s.link}>🔊 উত্তর শুনুন</Text>
        </Pressable>}
      </View>)}
      {busy&&<Text style={s.link}>OMNIVARA is thinking…</Text>}
    </ScrollView>
    {selectedImage&&<View style={s.imagePreviewWrap}>
      <Image source={{uri:selectedImage.uri}} style={s.imagePreview}/>
      <Pressable onPress={()=>setSelectedImage(null)} style={s.removeImage}><Text style={s.buttonText}>✕</Text></Pressable>
      <Text style={s.imageLabel}>ছবি সংযুক্ত করার জন্য প্রস্তুত</Text>
    </View>}
    <View style={s.row}>
      <Pressable onPress={chooseImage} disabled={busy} style={s.micButton}>
        <Text style={s.buttonText}>＋</Text>
      </Pressable>
      <Pressable onPress={startVoiceInput} disabled={busy} style={[s.micButton,listening&&s.micActive]}>
        <Text style={s.buttonText}>{listening?"■":"🎤"}</Text>
      </Pressable>
      <Pressable onPress={()=>setWebSearch(v=>!v)} disabled={busy} style={[s.micButton,webSearch&&s.micActive]}>
        <Text style={s.buttonText}>🌐</Text>
      </Pressable>
      <TextInput value={message} onChangeText={setMessage} placeholder={listening?"শুনছি… বলুন":"আপনার প্রশ্ন লিখুন..."} placeholderTextColor="#929cab" style={[s.input,{flex:1,marginBottom:0}]}/>
      <Pressable onPress={send} disabled={busy||(!message.trim()&&!selectedImage)} style={s.button}>
        <Text style={s.buttonText}>↑</Text>
      </Pressable>
    </View>
    <Text style={s.voiceHint}>{webSearch?"🌐 Web Search চালু — উত্তরে লাইভ ওয়েব ফলাফল ব্যবহার হবে":listening?"কথা শেষ হলে মাইক্রোফোনে আবার চাপ দিন":"মাইক্রোফোনে কথা বলুন অথবা 🔊 দিয়ে উত্তর শুনুন"}</Text>
  </SafeAreaView>;
}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:"#0b0e13",padding:18},
 header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
 brand:{color:"#f4f2ec",fontWeight:"800",fontSize:23,letterSpacing:2},
 tag:{color:"#d6b66d",fontSize:9,letterSpacing:2,marginTop:8,marginBottom:32},
 heading:{color:"#fff",fontSize:27,fontWeight:"700",marginVertical:20},
 input:{backgroundColor:"#121923",borderColor:"#394555",borderWidth:1,borderRadius:10,padding:14,color:"#fff",marginBottom:12},
 button:{backgroundColor:"#d6b66d",padding:14,borderRadius:10,alignItems:"center",justifyContent:"center"},
 buttonText:{color:"#111",fontWeight:"700"},
 link:{color:"#d6b66d",padding:12},
 note:{color:"#929cab",fontSize:10,marginTop:18},
 row:{flexDirection:"row",gap:8,alignItems:"center"},
 card:{backgroundColor:"#121923",padding:16,borderRadius:14,marginBottom:12},
 gold:{color:"#d6b66d",fontSize:10,letterSpacing:2},
 reply:{color:"#f4f2ec",fontSize:16,lineHeight:24,marginTop:8},
 chatChip:{backgroundColor:"#263342",padding:10,borderRadius:10},
 micButton:{backgroundColor:"#263342",padding:14,borderRadius:10,alignItems:"center",justifyContent:"center"},
 micActive:{backgroundColor:"#d6b66d"},
 memoryPanel:{backgroundColor:"#121923",borderRadius:12,padding:12,marginTop:10,marginBottom:8},
 memoryRow:{flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderBottomColor:"#394555",paddingVertical:5},
 listenButton:{alignSelf:"flex-start",marginTop:4},
 imagePreviewWrap:{alignSelf:"flex-start",marginBottom:10,backgroundColor:"#121923",padding:8,borderRadius:12},
 imagePreview:{width:110,height:110,borderRadius:8},
 removeImage:{position:"absolute",top:2,right:2,backgroundColor:"#d6b66d",borderRadius:14,paddingHorizontal:8,paddingVertical:3},
 imageLabel:{color:"#d6b66d",fontSize:10,marginTop:5},
 voiceHint:{color:"#929cab",fontSize:11,textAlign:"center",paddingTop:8}
});
