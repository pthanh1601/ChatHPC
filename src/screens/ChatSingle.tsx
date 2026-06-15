import { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, LayoutAnimation, UIManager, Keyboard, Alert, Linking } from 'react-native';
import { ArrowLeft, Phone, Video, CheckCheck, Plus, Mic, Send, ChevronDown, Image as ImageIcon, File as FileIcon, X, Play, Trash2, PhoneOff } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { AppScreen, CONTACTS, MEDIA } from '../data';
import { getMatrixClient, currentActiveRoomId, matrixService, decryptMatrixFile } from './matrix';
import { Header } from '../components/Header';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatDurationStr = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const MatrixImage = ({ url, client }: { url: string, client: any }) => {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    const loadImg = async () => {
      try {
        const safeId = url.replace(/[^a-zA-Z0-9]/g, '_').substring(Math.max(0, url.length - 30));
        const fileUri = FileSystem.cacheDirectory + 'img_v3_' + safeId + '.jpg';
        const info = await FileSystem.getInfoAsync(fileUri);
        
        if (info.exists) {
          setLocalUri(fileUri);
        } else {
          const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
            headers: client?.getAccessToken() ? { Authorization: `Bearer ${client.getAccessToken()}` } : {}
          });
          if (downloadResult.status === 200) {
            setLocalUri(downloadResult.uri);
          } else {
            setError(true);
          }
        }
      } catch (e) {
        setError(true);
      }
    };
    loadImg();
  }, [url]);

  if (error) {
    return (
      <View className="w-[220px] h-[150px] bg-red-500/10 flex items-center justify-center rounded-lg border border-red-500/20">
        <Text className="text-red-400 text-xs">Không thể tải ảnh</Text>
      </View>
    );
  }

  if (!localUri) {
    return (
      <View className="w-[220px] h-[220px] bg-white/5 flex items-center justify-center rounded-lg border border-white/10">
        <ActivityIndicator color="#dcb8ff"/>
      </View>
    );
  }

  return <Image source={{ uri: localUri }} style={{ width: 220, height: 220, resizeMode: 'cover' }} className="rounded-lg" />;
};

export function ChatSingle({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [blurIntensity, setBlurIntensity] = useState(0);
  const [inputText, setInputText] = useState('');
  
  const getRoomMessages = () => {
    const client = getMatrixClient();
    if (!client || !currentActiveRoomId) return [];
    const room = client.getRoom(currentActiveRoomId);
    if (!room) return [];

    return room.timeline
      .filter(e => {
        const type = e.getType();
        return type === 'm.room.message' || type === 'm.room.encrypted' || type === 'm.call.invite';
      })
      .map((e: any) => {
        const date = new Date(e.getTs());
        const time = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
        
        let text = "Tin nhắn không có nội dung";
        let msgType = "m.text";
        let mediaUrl = null;
        let info = null;
        let fileName = 'file';

        const type = e.getType();
        
        if (type === 'm.call.invite') {
          msgType = 'm.call';
          const isVideo = e.getContent()?.offer?.sdp?.includes('m=video');
          const callId = e.getContent()?.call_id;
          
          const relatedEvents = room.timeline.filter((evt: any) => evt.getContent()?.call_id === callId);
          const answerEvent = relatedEvents.find((evt: any) => evt.getType() === 'm.call.answer');
          const hangupEvent = relatedEvents.find((evt: any) => evt.getType() === 'm.call.hangup');
          const rejectEvent = relatedEvents.find((evt: any) => evt.getType() === 'm.call.reject');
          
          const isOutgoing = e.getSender() === client.getUserId();
          
          if (rejectEvent || (hangupEvent && (!answerEvent || hangupEvent.getContent()?.reason === 'user_hangup'))) {
            text = isOutgoing ? '📞 Cuộc gọi không trả lời' : '📞 Cuộc gọi nhỡ';
            msgType = 'm.call.missed';
          } else if (answerEvent && hangupEvent) {
            const durationMs = hangupEvent.getTs() - answerEvent.getTs();
            const durationSec = Math.max(0, Math.floor(durationMs / 1000));
            text = `${isVideo ? '�' : '�📞'} Cuộc gọi kết thúc (${formatDurationStr(durationSec)})`;
            msgType = 'm.call.ended';
          } else if (answerEvent) {
            text = `${isVideo ? '📹' : '📞'} Cuộc gọi đang diễn ra...`;
            msgType = 'm.call.ongoing';
          } else {
            text = isOutgoing ? '📞 Đang gọi...' : '📞 Cuộc gọi đến...';
            msgType = 'm.call.calling';
          }
        } else if (e.isEncrypted()) {
          const clear = e.getClearContent();
          msgType = clear ? clear.msgtype : "m.text";
          text = clear ? (clear.body || text) : "🔒 Tin nhắn đang được giải mã...";
          
          if (clear) {
            if (clear.url) mediaUrl = clear.url;
            if (clear.file) mediaUrl = clear.file.url;
            if (clear.body) fileName = clear.body;
            
            info = clear.info || {};
            if (clear.file && !info.encryptedFileInfo) {
              info.encryptedFileInfo = clear.file;
            }
          }
        } else {
          const content = e.getContent();
          msgType = content.msgtype || "m.text";
          text = content.body || text;
          if (content.url) mediaUrl = content.url;
          if (content.body) fileName = content.body;
          info = content.info;
        }

        if (mediaUrl && mediaUrl.startsWith('mxc://')) {
          mediaUrl = client.mxcUrlToHttp(mediaUrl);
        }

        return {
          id: e.getId(),
          sender: e.getSender(),
          isMe: e.getSender() === client.getUserId(),
          text: text,
          time: time,
          senderName: room.getMember(e.getSender())?.name || e.getSender(),
          msgType,
          mediaUrl,
          fileName,
          info,
          matrixEvent: e
        };
      });
  };

  // Khởi tạo state tức thì, chặn chớp trắng (flicker)
  const [messages, setMessages] = useState<any[]>(getRoomMessages);
  const [roomInfo, setRoomInfo] = useState(() => {
    const client = getMatrixClient();
    const room = client?.getRoom(currentActiveRoomId || '');
    return {
      name: room?.name || 'Phòng chat',
      avatar: room?.getAvatarUrl(client?.getHomeserverUrl() || '', 96, 96, 'crop', false, false) || CONTACTS.kael.avatar,
      members: room?.getJoinedMemberCount() || 0
    };
  });

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const isHistoryLoadingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevContentHeight = useRef(0);
  const shouldScrollRef = useRef(true);
  const isNearBottomRef = useRef(true);
  const isInitialMountRef = useRef(true); // Biến để kiểm tra lần render đầu tiên

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => setRecordDuration(prev => prev + 1), 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          name: asset.fileName || asset.uri.split('/').pop() || 'image.jpg',
          type: asset.mimeType?.startsWith('image/') ? asset.mimeType : (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
          size: asset.fileSize
        };
        matrixService.uploadFile(currentActiveRoomId!, file).catch(err => {
          Alert.alert('Lỗi', 'Không thể gửi hình ảnh: ' + err.message);
        });
        shouldScrollRef.current = true;
      }
    } catch (e) { console.error(e); }
    setShowAttachMenu(false);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size
        };
        matrixService.uploadFile(currentActiveRoomId!, file).catch(err => {
          Alert.alert('Lỗi', 'Không thể gửi tài liệu: ' + err.message);
        });
        shouldScrollRef.current = true;
      }
    } catch (e) { console.error(e); }
    setShowAttachMenu(false);
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) { console.error('Failed to start recording', err); }
  };

  const stopRecording = async (send: boolean) => {
    if (!recording) {
      setIsRecording(false);
      return;
    }
    try {
      const status = await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      const finalDurationMs = status.durationMillis || recordDuration * 1000 || 1000;

      setRecording(null);
      setIsRecording(false);
      setRecordDuration(0);

      if (send && uri && currentActiveRoomId) {
        const file = { 
          uri, 
          name: 'voice_message.m4a', 
          type: 'audio/m4a', 
          size: status.fileSize || 0,
          info: {
            duration: finalDurationMs,
            mimetype: 'audio/m4a'
          },
          duration: finalDurationMs 
        };
        matrixService.uploadFile(currentActiveRoomId, file).then((uploadedEvent: any) => {
          if (uploadedEvent && uploadedEvent.event_id) {
            const safeId = uploadedEvent.event_id.replace(/[^a-zA-Z0-9]/g, '_');
            const targetCacheUri = FileSystem.cacheDirectory + 'audio_v3_' + safeId + '.m4a';
            FileSystem.copyAsync({ from: uri, to: targetCacheUri }).catch(() => {});
          }
        })
        .catch(err => {
          Alert.alert('Lỗi', 'Không thể gửi ghi âm: ' + err.message);
        });
        shouldScrollRef.current = true;
      }
    } catch (err) { 
      console.error('Failed to stop recording', err); 
      setRecording(null);
      setIsRecording(false);
      setRecordDuration(0);
    }
  };

  const playAudio = async (url: string, id: string, msgItem?: any) => {
    if (playingAudioId === id) {
      await audioPlayerRef.current?.stopAsync();
      setPlayingAudioId(null);
      return;
    }
    if (audioPlayerRef.current) {
      try {
        await audioPlayerRef.current.stopAsync();
        await audioPlayerRef.current.unloadAsync();
      } catch (e) {}
    }
    try {
      const client = getMatrixClient();
      if (!client) return;

      let playUrl = "";
      const safeId = (id || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
      const cacheUri = FileSystem.cacheDirectory + 'audio_v3_' + safeId + '.m4a';
      const checkCache = await FileSystem.getInfoAsync(cacheUri);
      
      if (checkCache.exists) {
        playUrl = cacheUri;
      } else if (msgItem?.matrixEvent?.isEncrypted() && msgItem?.info?.encryptedFileInfo) {
        setIsLoadingHistory(true); 
        
        try {
          const encryptedFileInfo = msgItem.info.encryptedFileInfo;
          
          // Gọi helper bẻ khóa attachment từ ArrayBuffer
          const decryptedBuffer = await decryptMatrixFile(encryptedFileInfo);
          
          // Chuyển đổi ArrayBuffer thu được sang chuỗi Base64 để ghi vào hệ thống Expo FileSystem
          // Tối ưu: Dùng `Buffer` (đã được polyfill ở index.js) thay vì btoa
          const base64Data = Buffer.from(decryptedBuffer).toString('base64');

          await FileSystem.writeAsStringAsync(cacheUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          playUrl = cacheUri;
        } catch (decryptError) {
          console.error("Lỗi giải mã E2EE, thử nghiệm luồng fallback tải trực tiếp...", decryptError);
          let downloadUrl = url.startsWith('mxc://') ? client.mxcUrlToHttp(url) : url;
          if (!downloadUrl) throw new Error("Không thể phân giải mã URL từ server");

          const downloadResult = await FileSystem.downloadAsync(downloadUrl, cacheUri, {
            headers: client.getAccessToken() ? { Authorization: `Bearer ${client.getAccessToken()}` } : {}
          });
          if (downloadResult.status !== 200) throw new Error(`Mã lỗi HTTP: ${downloadResult.status}`);
          playUrl = downloadResult.uri;
        } finally {
          setIsLoadingHistory(false);
        }
      } else {
        let downloadUrl = url.startsWith('mxc://') ? client.mxcUrlToHttp(url) : url;
        if (!downloadUrl) throw new Error("Không thể phân giải mã URL từ server");

        const downloadResult = await FileSystem.downloadAsync(downloadUrl, cacheUri, {
          headers: client.getAccessToken() ? { Authorization: `Bearer ${client.getAccessToken()}` } : {}
        });
        if (downloadResult.status !== 200) {
          throw new Error(`Mã lỗi HTTP từ máy chủ: ${downloadResult.status}`);
        }
        playUrl = downloadResult.uri;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldRouteThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: playUrl }, 
        { shouldPlay: true }
      );
      audioPlayerRef.current = sound;
      setPlayingAudioId(id);
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudioId(null);
        }
      });
    } catch (e: any) { 
      console.error("Lỗi phát audio chi tiết:", e); 
      Alert.alert("Lỗi", "Không thể phát tin nhắn thoại này. Tệp tin đang được đồng bộ hoặc chưa thể giải mã mã hóa đầu cuối.");
      setPlayingAudioId(null);
    }
  };

  const handleOpenFile = async (url: string, fileName: string) => {
    try {
      const client = getMatrixClient();
      if (!url || !client) return;
      
      const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
      const cleanBaseName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9\-_]/g, '_');
      const safeName = extension ? `${cleanBaseName}.${extension}` : cleanBaseName;
      
      const localUri = FileSystem.documentDirectory + safeName;
      
      setIsLoadingHistory(true); 

      const { uri, status } = await FileSystem.downloadAsync(url, localUri, {
        headers: client.getAccessToken() ? { Authorization: `Bearer ${client.getAccessToken()}` } : {}
      });

      setIsLoadingHistory(false);

      if (status !== 200) {
        Alert.alert('Lỗi', 'Tải file thất bại từ máy chủ (Mã lỗi: ' + status + ')');
        return;
      }

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, { mimeType: undefined, dialogTitle: 'Mở tệp tin' });
      } else {
        Alert.alert('Thành công', 'Đã lưu file tại bộ nhớ ứng dụng.');
      }
    } catch (e: any) {
      setIsLoadingHistory(false);
      Alert.alert('Lỗi', 'Không thể tải tệp: ' + e.message);
    }
  };

  useEffect(() => {
    const client = getMatrixClient();
    if (!client || !currentActiveRoomId) return;

    const room = client.getRoom(currentActiveRoomId);
    if (!room) return;

    shouldScrollRef.current = true;

    // Lắng nghe timeline
    const onTimelineEvent = (event: any, roomObj: any, toStartOfTimeline: boolean) => {
      if (event.getRoomId() !== currentActiveRoomId) return;
      if (toStartOfTimeline && !isHistoryLoadingRef.current) return;

      if (!toStartOfTimeline) {
        // Tự động cuộn xuống nếu đang ở gần cuối trang, hoặc nếu mình là người gửi tin
        if (isNearBottomRef.current || event.getSender() === client.getUserId()) {
          shouldScrollRef.current = true;
        }
      }
      
      setMessages(getRoomMessages());
      if (toStartOfTimeline) return;

      if (room.timeline.length > 0) {
        client.sendReadReceipt(room.timeline[room.timeline.length - 1]);
      }
    };

    // Lắng nghe sự kiện giải mã xong
    const onDecrypted = (event: any) => {
      if (event.getRoomId() === currentActiveRoomId) {
        // Vẫn giữ ở cuối trang khi giải mã xong nếu người dùng đang ở cuối trang
        if (isNearBottomRef.current) {
          shouldScrollRef.current = true;
        }
        // Ép Component Render lại ngay lập tức để dòng chữ khóa biến thành nội dung thật
        setMessages(getRoomMessages());
      }
    };

    // Lắng nghe người khác đang gõ phím
    const onTyping = (event: any, member: any) => {
      if (member.roomId !== currentActiveRoomId) return;
      const members = room.getMembersWithMembership('join');
      const typing = members.filter((m: any) => m.typing && m.userId !== client.getUserId());
      setTypingUsers(typing.map((m: any) => m.name || m.userId.split(':')[0].replace('@', '')));
    };

    client.on('Room.timeline' as any, onTimelineEvent);
    client.on('Event.decrypted' as any, onDecrypted);
    client.on('RoomMember.typing' as any, onTyping);

    // Đánh dấu đã đọc nếu có tin nhắn mới nhất
    if (room.timeline.length > 0) {
      client.sendReadReceipt(room.timeline[room.timeline.length - 1]);
    }

    return () => {
      client.removeListener('Room.timeline' as any, onTimelineEvent);
      client.removeListener('Event.decrypted' as any, onDecrypted);
      client.removeListener('RoomMember.typing' as any, onTyping);
    };
  }, []);

  // CHỈ cuộn xuống cuối cùng khi bàn phím bật lên NẾU bạn đang ở gần tin nhắn mới nhất
  useEffect(() => {
    const keyboardListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        if (isNearBottomRef.current) {
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    );
    return () => keyboardListener.remove();
  }, []);

  // Hàm tải thêm tin nhắn cũ
  const loadMoreHistory = async () => {
    const client = getMatrixClient();
    if (!client || !currentActiveRoomId) return;
    const room = client.getRoom(currentActiveRoomId);
    
    if (!isHistoryLoadingRef.current && room) {
      const timeline = room.getLiveTimeline();
      if (timeline.getPaginationToken("b")) {
        isHistoryLoadingRef.current = true;
        setIsLoadingHistory(true);
        try {
          await client.scrollback(room, 30);
        } catch (err) {
          console.log("Lỗi tải lịch sử:", err);
        } finally {
          setIsLoadingHistory(false);
          isHistoryLoadingRef.current = false;
        }
      }
    }
  };

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    
    if (contentOffset.y < 50 && !isLoadingHistory) {
      loadMoreHistory();
    }

    // Tính toán khoảng cách tới tin nhắn mới nhất
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    isNearBottomRef.current = distanceFromBottom <= 150;
    
    // Hiện/ẩn nút cuộn xuống giống FB Messenger
    if (distanceFromBottom > 150) {
      if (!showScrollDown) setShowScrollDown(true);
    } else {
      if (showScrollDown) setShowScrollDown(false);
    }
  };

  const handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
    if (isHistoryLoadingRef.current && prevContentHeight.current > 0) {
      const diff = contentHeight - prevContentHeight.current;
      scrollViewRef.current?.scrollTo({ y: diff, animated: false });
    } else if (shouldScrollRef.current) {
      // Nhảy thẳng xuống ngay lập tức trong lần load đầu tiên, không hiện animation chậm
      scrollViewRef.current?.scrollToEnd({ animated: !isInitialMountRef.current });
      shouldScrollRef.current = false;
      isInitialMountRef.current = false;
    }
    prevContentHeight.current = contentHeight;
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    
    const client = getMatrixClient();
    if (client && currentActiveRoomId) {
      client.sendTyping(currentActiveRoomId, true, 5000);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        client.sendTyping(currentActiveRoomId, false);
      }, 3000);
    }
  };

  const handleSend = () => {
    const client = getMatrixClient();
    if (!inputText.trim() || !client || !currentActiveRoomId) return;

    // Tắt trạng thái typing
    client.sendTyping(currentActiveRoomId, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Gọi hàm bọc mã hóa E2EE thay vì dùng trực tiếp client
    matrixService.sendMessage(currentActiveRoomId, inputText.trim());

    setInputText('');
    shouldScrollRef.current = true;
  };

  const renderMessageContent = (msg: any) => {
    const client = getMatrixClient();
    if (msg.msgType?.startsWith('m.call')) {
      let iconColor = msg.isMe ? "#fff" : "#dcb8ff";
      if (msg.msgType === 'm.call.missed') iconColor = "#ef4444";
      else if (msg.msgType === 'm.call.ended') iconColor = msg.isMe ? "#fff" : "#a0a0a0";

      const isVideo = msg.text.includes('📹');
      return (
        <View className="flex-row items-center gap-2 px-1 py-1">
          {msg.msgType === 'm.call.missed' ? <PhoneOff size={18} color={iconColor} /> : (isVideo ? <Video size={18} color={iconColor} /> : <Phone size={18} color={iconColor} />)}
          <Text className={`text-sm ${msg.msgType === 'm.call.missed' ? 'text-[#ef4444] font-medium' : (msg.msgType === 'm.call.ended' ? 'text-white/80' : 'text-white font-medium')}`}>{msg.text}</Text>
        </View>
      );
    }
    if (msg.msgType === 'm.image' && msg.mediaUrl) {
      return (
        <View className="overflow-hidden rounded-lg">
          <MatrixImage url={msg.mediaUrl} client={client} />
        </View>
      );
    }
    if (msg.msgType === 'm.audio' && msg.mediaUrl) {
      const isPlaying = playingAudioId === msg.id;
      const durationSecs = msg.info?.duration ? Math.round(msg.info.duration / 1000) : 0;
      return (
        <TouchableOpacity onPress={() => playAudio(msg.mediaUrl, msg.id, msg)} className="flex-row items-center gap-3 w-48 py-1">
          <View className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.isMe ? 'bg-background/20' : 'bg-primary/20'}`}>
            {isPlaying ? <View className="w-3 h-3 bg-white rounded-sm" /> : <Play size={20} color={msg.isMe ? "#fff" : "#dcb8ff"} style={{ marginLeft: 3 }} />}
          </View>
          <View className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
             <View className={`h-full ${isPlaying ? 'w-full' : 'w-0'} bg-white`} />
          </View>
          <Text className="text-white text-xs">{formatDurationStr(durationSecs)}</Text>
        </TouchableOpacity>
      );
    }
    if (msg.msgType === 'm.file' || msg.msgType === 'm.video') {
      return (
        <TouchableOpacity onPress={() => handleOpenFile(msg.mediaUrl, msg.fileName)} className="flex-row items-center gap-3">
          <View className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            <FileIcon size={20} color="#fff" />
          </View>
          <View className="flex-1 max-w-[150px]">
            <Text className="text-white text-sm" numberOfLines={1} ellipsizeMode="middle">{msg.text}</Text>
            <Text className="text-white/60 text-xs mt-1">Nhấn để xem / Tải về</Text>
          </View>
        </TouchableOpacity>
      );
    }
    return <Text className="text-base text-white" style={{ includeFontPadding: false }}>{msg.text}</Text>;
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background relative" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header blurIntensity={blurIntensity}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setScreen('chat_list');
          }} className="mr-4">
            <ArrowLeft size={24} color="#dcb8ff" />
          </TouchableOpacity>
          <View className="flex-row items-center">
            <View className="relative mr-3">
              <View className="w-10 h-10 rounded-full overflow-hidden border-2 border-secondary">
                <Image source={{ uri: roomInfo.avatar }} className="w-full h-full" />
              </View>
              <View className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-background"></View>
            </View>
            <View>
              <Text className="text-xl font-bold text-primary">{roomInfo.name}</Text>
              <Text className="text-xs font-medium text-secondary/80">{roomInfo.members} thành viên</Text>
            </View>
          </View>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => matrixService.placeCall(currentActiveRoomId || '', 'voice')} className="mr-6">
            <Phone size={24} color="#a0a0a0" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => matrixService.placeCall(currentActiveRoomId || '', 'video')}>
            <Video size={24} color="#a0a0a0" />
          </TouchableOpacity>
        </View>
      </Header>

      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)));
          handleScroll(e);
        }}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-col gap-6 pt-[120px] pb-4">
          {isLoadingHistory && <ActivityIndicator size="small" color="#dcb8ff" className="my-2" />}
          
          {messages.map((msg, index) => {
            return msg.isMe ? (
              <View key={msg.id || index} className="flex-col items-end max-w-[85%] self-end mb-2">
                <View className="bg-bubble rounded-xl rounded-tr-none p-3 shadow-lg">
                  {renderMessageContent(msg)}
                </View>
                <View className="flex-row items-center gap-1 mt-1 mr-1">
                  <Text className="text-[10px] text-gray-500">{msg.time}</Text>
                  <CheckCheck size={14} color="#00fbfb" />
                </View>
              </View>
            ) : (
              <View key={msg.id || index} className="flex-col items-start max-w-[85%] mb-2">
                <Text className="text-xs text-gray-400 mb-1 ml-1">{msg.senderName}</Text>
                <View className="bg-card rounded-xl rounded-tl-none p-3 shadow-sm border border-white/5">
                  {renderMessageContent(msg)}
                </View>
                <Text className="text-[10px] mt-1 text-gray-500 ml-1">{msg.time}</Text>
              </View>
            );
          })}

          {typingUsers.length > 0 && (
            <View className="flex-row items-center mt-2 mb-2 ml-2">
              <Text className="text-xs text-gray-400 italic">
                {typingUsers.length > 2 ? "Nhiều người đang nhập..." : `${typingUsers.join(', ')} đang nhập...`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Nút cuộn xuống cuối (Messenger style) */}
      {showScrollDown && (
        <TouchableOpacity 
          className="absolute right-5 w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-white/10 shadow-xl z-[100]"
          style={{ bottom: 90 }}
          onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          <ChevronDown size={24} color="#dcb8ff" />
        </TouchableOpacity>
      )}

      <View className="w-full z-50 px-5 pb-6 pt-4 bg-background/90">
        {showAttachMenu && !isRecording && (
          <View className="pb-4 flex-row gap-6">
            <TouchableOpacity onPress={handlePickImage} className="items-center">
              <View className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mb-2">
                <ImageIcon size={22} color="#00fbfb" />
              </View>
              <Text className="text-[11px] font-medium text-gray-300">Hình ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickDocument} className="items-center">
              <View className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-2">
                <FileIcon size={22} color="#dcb8ff" />
              </View>
              <Text className="text-[11px] font-medium text-gray-300">Tài liệu</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="bg-card rounded-full p-1.5 flex-row items-center border border-white/10">
          {isRecording ? (
            <>
              <TouchableOpacity onPress={() => stopRecording(false)} className="w-12 h-12 flex items-center justify-center bg-red-500/20 rounded-full mr-2">
                <Trash2 size={22} color="#ef4444" />
              </TouchableOpacity>
              <View className="flex-1 flex-row items-center gap-2 px-2">
                <View className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <Text className="text-white text-[15px] font-medium">Đang ghi âm... {formatDurationStr(recordDuration)}</Text>
              </View>
              <TouchableOpacity onPress={() => stopRecording(true)} className="w-12 h-12 flex items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
                <Send size={20} color="#1a1f2e" style={{ marginLeft: -2 }} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setShowAttachMenu(!showAttachMenu)} className="w-12 h-12 flex items-center justify-center">
                {showAttachMenu ? <X size={24} color="#a0a0a0" /> : <Plus size={28} color="#dcb8ff" />}
              </TouchableOpacity>
              <View className="flex-1 h-12 bg-background/50 rounded-full justify-center px-4 mx-1">
                <TextInput 
                  placeholder="Nhập tin nhắn..." 
                  placeholderTextColor="#a0a0a0" 
                  value={inputText}
                  onChangeText={handleInputChange}
                  onFocus={() => {
                    setShowAttachMenu(false);
                    if (isNearBottomRef.current) {
                      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                    }
                  }}
                  multiline={true}
                  blurOnSubmit={false}
                  className="w-full text-base text-white p-0" 
                  style={{ 
                    includeFontPadding: false, 
                    textAlignVertical: 'center',
                    paddingVertical: 0,
                    marginTop: -4
                  }}
                />
              </View>
              {inputText.trim().length === 0 ? (
                <TouchableOpacity onPress={startRecording} className="w-12 h-12 flex items-center justify-center mr-1">
                  <Mic size={24} color="#00fbfb" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleSend} className="w-12 h-12 flex items-center justify-center rounded-full bg-bubble shadow-lg shadow-primary/20">
                  <Send size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
