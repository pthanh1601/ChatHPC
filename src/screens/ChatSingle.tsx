import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, LayoutAnimation, UIManager, Keyboard, Alert, Linking, InteractionManager, FlatList } from 'react-native';
import { ArrowLeft, Phone, Video, CheckCheck, Plus, Mic, Send, ChevronDown, Image as ImageIcon, File as FileIcon, X, Play, Trash2, PhoneOff } from 'lucide-react-native';
import { Audio, Video as ExpoVideo, ResizeMode } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { AppScreen, CONTACTS, MEDIA } from '../data';
import { getMatrixClient, currentActiveRoomId, matrixService } from '../services/MatrixService';
import { mediaService, decryptMatrixFile } from '../services/MediaService';
import { voipService } from '../services/VoipService';
import { Header } from '../components/Header';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatDurationStr = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getDisplayDimensions = (originalWidth?: number, originalHeight?: number) => {
  const maxW = 240;
  const maxH = 240;
  
  if (!originalWidth || !originalHeight) {
    return { width: 220, height: 220 };
  }
  
  const aspectRatio = originalWidth / originalHeight;
  if (aspectRatio > 1) {
    // Landscape
    const displayWidth = maxW;
    const displayHeight = Math.round(maxW / aspectRatio);
    return { width: displayWidth, height: displayHeight };
  } else {
    // Portrait or Square
    const displayHeight = maxH;
    const displayWidth = Math.round(maxH * aspectRatio);
    return { width: displayWidth, height: displayHeight };
  }
};

const MatrixImage = ({ url, client, info: fileInfo, eventId, mxcUrl, fileName }: { url: string, client: any, info: any, eventId: string, mxcUrl?: string | null, fileName?: string }) => {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { width: displayWidth, height: displayHeight } = getDisplayDimensions(fileInfo?.w, fileInfo?.h);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;

    const loadImg = async () => {
      try {
        if (url.startsWith('file://')) {
          if (isMounted) setLocalUri(url);
          return;
        }
        const cacheKey = mxcUrl || url;
        const safeId = cacheKey.replace(/[^a-zA-Z0-9]/g, '_');
        
        let ext = 'jpg';
        if (fileName) {
          const parts = fileName.split('.');
          if (parts.length > 1) {
            ext = parts.pop()!.toLowerCase();
          }
        } else if (fileInfo?.mimetype) {
          const mimeExt = fileInfo.mimetype.split('/').pop()?.toLowerCase();
          if (mimeExt === 'jpeg') ext = 'jpg';
          else if (mimeExt) ext = mimeExt;
        }

        // Kiểm tra cache với extension chính xác
        let fileUri = FileSystem.cacheDirectory + 'img_v3_' + safeId + '.' + ext;
        let fileExists = await FileSystem.getInfoAsync(fileUri);

        // Fallback kiểm tra các extension phổ biến khác nếu không thấy (.jpg, .jpeg, .png, .heic, .heif)
        if (!fileExists.exists) {
          const candidates = ['jpg', 'jpeg', 'png', 'heic', 'heif'].filter(c => c !== ext);
          for (const cExt of candidates) {
            const altUri = FileSystem.cacheDirectory + 'img_v3_' + safeId + '.' + cExt;
            const altExists = await FileSystem.getInfoAsync(altUri);
            if (altExists.exists) {
              fileUri = altUri;
              fileExists = altExists;
              break;
            }
          }
        }

        // Fallback kiểm tra thêm đuôi viết hoa
        if (!fileExists.exists) {
          const candidatesUpper = ['jpg', 'jpeg', 'png', 'heic', 'heif'].map(c => c.toUpperCase());
          for (const cExt of candidatesUpper) {
            const altUri = FileSystem.cacheDirectory + 'img_v3_' + safeId + '.' + cExt;
            const altExists = await FileSystem.getInfoAsync(altUri);
            if (altExists.exists) {
              fileUri = altUri;
              fileExists = altExists;
              break;
            }
          }
        }

        if (fileExists.exists) {
          if (isMounted) setLocalUri(fileUri);
          return;
        }

        // Tối ưu hóa: Ưu tiên giải mã thumbnail_file (rất nhẹ) để hiển thị tức thì trên luồng chat
        // Thay vì phải giải mã file gốc vài MB bằng JS Fallback làm treo app vài giây.
        const targetEncryptInfo = fileInfo?.thumbnail_file || fileInfo?.encryptedFileInfo;
        
        if (targetEncryptInfo) {
          try {
            await decryptMatrixFile(targetEncryptInfo, fileUri);
            if (isMounted) setLocalUri(fileUri);
          } catch (decryptError: any) {
            console.error("Lỗi giải mã hình ảnh:", decryptError);
            if (isMounted) setError("Không thể giải mã hình ảnh.");
          }
          return;
        }

        const targetDownloadUrl = fileInfo?.thumbnail_url || fileInfo?.thumbnail_info?.url || url;
        let finalHttpUrl = targetDownloadUrl.startsWith('mxc://') ? client.mxcUrlToHttp(targetDownloadUrl) : targetDownloadUrl;
        if (!finalHttpUrl) throw new Error("Không thể phân giải mã URL từ server");
        finalHttpUrl = finalHttpUrl.replace(/\/_matrix\/media\/(r0|v3)\/(download|thumbnail)\//, '/_matrix/client/v1/media/$2/');

        const downloadResult = await FileSystem.downloadAsync(finalHttpUrl, fileUri, {
          headers: client?.getAccessToken() ? { Authorization: `Bearer ${client.getAccessToken()}` } : {}
        });

        if (downloadResult.status === 200) {
          if (isMounted) setLocalUri(downloadResult.uri);
        } else {
          if (isMounted) setError(`Không thể tải ảnh (mã lỗi ${downloadResult.status})`);
        }
      } catch (e: any) {
        console.error("Lỗi tải hình ảnh:", e);
        if (isMounted) setError(e.message || "Lỗi không xác định.");
      }
    };

    loadImg();

    return () => {
      isMounted = false;
    };
  }, [url, eventId, fileInfo, mxcUrl, fileName]);

  if (error) {
    return (
      <View style={{ width: displayWidth, height: displayHeight }} className="bg-red-500/10 flex items-center justify-center rounded-lg border border-red-500/20 p-2">
        <Text className="text-red-400 text-xs text-center">{error}</Text>
      </View>
    );
  }

  if (!localUri) {
    return (
      <View style={{ width: displayWidth, height: displayHeight }} className="bg-white/5 flex items-center justify-center rounded-lg border border-white/10">
        <ActivityIndicator color="#dcb8ff" />
      </View>
    );
  }

  return <Image source={{ uri: localUri }} style={{ width: displayWidth, height: displayHeight, resizeMode: 'contain' }} className="rounded-lg" />;
};

const MatrixVideo = ({ url, client, info: fileInfo, eventId, mxcUrl, fileName }: { url: string, client: any, info: any, eventId: string, mxcUrl?: string | null, fileName?: string }) => {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<ExpoVideo>(null);
  const { width: displayWidth, height: displayHeight } = getDisplayDimensions(fileInfo?.w, fileInfo?.h);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;

    const loadVid = async () => {
      try {
        if (url.startsWith('file://')) {
          if (isMounted) setLocalUri(url);
          return;
        }
        const cacheKey = mxcUrl || url;
        const safeId = cacheKey.replace(/[^a-zA-Z0-9]/g, '_');
        
        let ext = 'mp4';
        if (fileName) {
          const parts = fileName.split('.');
          if (parts.length > 1) {
            ext = parts.pop()!.toLowerCase();
          }
        } else if (fileInfo?.mimetype) {
          const mimeExt = fileInfo.mimetype.split('/').pop()?.toLowerCase();
          if (mimeExt === 'quicktime') ext = 'mov';
          else if (mimeExt) ext = mimeExt;
        }

        // Kiểm tra cache với extension chính xác
        let fileUri = FileSystem.cacheDirectory + 'vid_v3_' + safeId + '.' + ext;
        let fileExists = await FileSystem.getInfoAsync(fileUri);

        // Fallback kiểm tra các extension phổ biến khác nếu không thấy
        if (!fileExists.exists) {
          const altExt = ext === 'mp4' ? 'mov' : 'mp4';
          const altUri = FileSystem.cacheDirectory + 'vid_v3_' + safeId + '.' + altExt;
          const altExists = await FileSystem.getInfoAsync(altUri);
          if (altExists.exists) {
            fileUri = altUri;
            fileExists = altExists;
          }
        }

        // Fallback kiểm tra thêm đuôi viết hoa (.MOV, .MP4)
        if (!fileExists.exists) {
          const upperExts = [ext.toUpperCase(), (ext === 'mp4' ? 'mov' : 'mp4').toUpperCase()];
          for (const uExt of upperExts) {
            const upperUri = FileSystem.cacheDirectory + 'vid_v3_' + safeId + '.' + uExt;
            const upperExists = await FileSystem.getInfoAsync(upperUri);
            if (upperExists.exists) {
              fileUri = upperUri;
              fileExists = upperExists;
              break;
            }
          }
        }

        if (fileExists.exists) {
          if (isMounted) setLocalUri(fileUri);
          return;
        }

        if (fileInfo?.encryptedFileInfo) {
          try {
            await decryptMatrixFile(fileInfo.encryptedFileInfo, fileUri);
            if (isMounted) setLocalUri(fileUri);
          } catch (decryptError: any) {
            console.error("Lỗi giải mã video:", decryptError);
            if (isMounted) setError("Không thể giải mã video.");
          }
          return;
        }

        const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
          headers: client?.getAccessToken() ? { Authorization: `Bearer ${client.getAccessToken()}` } : {}
        });

        if (downloadResult.status === 200) {
          if (isMounted) setLocalUri(downloadResult.uri);
        } else {
          if (isMounted) setError(`Không thể tải video (mã lỗi ${downloadResult.status})`);
        }
      } catch (e: any) {
        console.error("Lỗi tải video:", e);
        if (isMounted) setError(e.message || "Lỗi không xác định.");
      }
    };

    loadVid();
    return () => { isMounted = false; };
  }, [url, eventId, fileInfo, mxcUrl, fileName]);

  if (error) {
    return (
      <View style={{ width: displayWidth, height: displayHeight }} className="bg-red-500/10 flex items-center justify-center rounded-lg border border-red-500/20 p-2">
        <Text className="text-red-400 text-xs text-center">{error}</Text>
      </View>
    );
  }

  if (!localUri) {
    return (
      <View style={{ width: displayWidth, height: displayHeight }} className="bg-white/5 flex items-center justify-center rounded-lg border border-white/10">
        <ActivityIndicator color="#dcb8ff" />
      </View>
    );
  }

  return (
    <ExpoVideo
      ref={videoRef}
      source={{ uri: localUri }}
      style={{ width: displayWidth, height: displayHeight, borderRadius: 8 }}
      useNativeControls
      resizeMode={ResizeMode.CONTAIN}
    />
  );
};

export function ChatSingle({ setScreen }: { setScreen: (s: AppScreen) => void }) {
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
        let mxcUrl = null;
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
            text = `${isVideo ? '📹' : '📞'} Cuộc gọi kết thúc (${formatDurationStr(durationSec)})`;
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
            // Đọc mxcUrl linh hoạt từ cả cấu trúc cũ lẫn cấu trúc chuẩn Element mới
            if (clear.url) mxcUrl = clear.url;
            if (clear.file && clear.file.url) mxcUrl = clear.file.url;

            if (!mxcUrl && clear["org.matrix.msc1767.file"]) {
              if (clear["org.matrix.msc1767.file"].url) mxcUrl = clear["org.matrix.msc1767.file"].url;
              if (clear["org.matrix.msc1767.file"].file) mxcUrl = clear["org.matrix.msc1767.file"].file.url;
            }

            if (clear.body) fileName = clear.body;

            info = clear.info || {};
            
            // ĐỒNG BỘ KHÓA GIẢI MÃ: Đảm bảo trường encryptedFileInfo luôn lấy đúng đối tượng chứa khóa gốc
            if (clear.file) {
              info.encryptedFileInfo = clear.file;
            } else if (!info.encryptedFileInfo && clear["org.matrix.msc1767.file"]?.file) {
              info.encryptedFileInfo = clear["org.matrix.msc1767.file"].file;
            }

            if (!info.duration && clear["org.matrix.msc1767.audio"]?.duration) {
              info.duration = clear["org.matrix.msc1767.audio"].duration;
            }
          }
        } else {
          const content = e.getContent();
          msgType = content.msgtype || "m.text";
          text = content.body || text;
          if (content.url) mxcUrl = content.url;
          if (content.file) mxcUrl = content.file.url;

          if (!mxcUrl && content["org.matrix.msc1767.file"]) {
            if (content["org.matrix.msc1767.file"].url) mxcUrl = content["org.matrix.msc1767.file"].url;
            if (content["org.matrix.msc1767.file"].file) mxcUrl = content["org.matrix.msc1767.file"].file.url;
          }

          if (content.body) fileName = content.body;
          info = content.info || {};
          if (content.file && !info.encryptedFileInfo) {
            info.encryptedFileInfo = content.file;
          } else if (!info.encryptedFileInfo && content["org.matrix.msc1767.file"]?.file) {
            info.encryptedFileInfo = content["org.matrix.msc1767.file"].file;
          }

          if (!info.duration && content["org.matrix.msc1767.audio"]?.duration) {
            info.duration = content["org.matrix.msc1767.audio"].duration;
          }
        }

        if (mxcUrl) {
          let generatedUrl = client.mxcUrlToHttp(mxcUrl);
          if (generatedUrl) {
            mediaUrl = generatedUrl.replace(/\/_matrix\/media\/(r0|v3)\/(download|thumbnail)\//, '/_matrix/client/v1/media/$2/');
          }
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
          mxcUrl,
          fileName,
          info,
          matrixEvent: e
        };
      });
  };

  const [messages, setMessages] = useState<any[]>([]);
  const [isUiReady, setIsUiReady] = useState(false);
  const [roomInfo, setRoomInfo] = useState({ name: 'Phòng chat', avatar: CONTACTS.kael.avatar, members: 0 });

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const isHistoryLoadingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ id: string, progress: number } | null>(null);
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
        quality: 0.8, // Nén ảnh 80%
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_960x540, // Độ phân giải 540p (qHD) để lọt qua giới hạn 10MB của Server
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';
        const fileExtension = asset.uri.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
        const fileName = asset.fileName || `media_${Date.now()}.${fileExtension}`;
        
        const fileToUpload = {
          uri: asset.uri,
          name: fileName,
          type: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
          size: asset.fileSize || 0,
          info: {
            w: asset.width,
            h: asset.height,
            duration: asset.duration ? asset.duration * 1000 : undefined
          }
        };

        const tempEventId = 'txn_media_' + Date.now();
        const date = new Date();
        const currentTimeStr = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');

        // Sinh ảnh thu nhỏ cục bộ
        let thumbnailData: any = null;
        try {
          if (isVideo) {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 1000, quality: 0.5 });
            const thumbInfo = await FileSystem.getInfoAsync(thumbUri) as any;
            thumbnailData = {
              uri: thumbUri,
              name: `thumb_${Date.now()}.jpg`,
              type: 'image/jpeg',
              size: thumbInfo.size || 0,
              info: { w: 800, h: 800 }
            };
          } else {
            const manipResult = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{ resize: { width: Math.min(800, asset.width || 800) } }],
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );
            const thumbInfo = await FileSystem.getInfoAsync(manipResult.uri) as any;
            thumbnailData = {
              uri: manipResult.uri,
              name: `thumb_${Date.now()}.jpg`,
              type: 'image/jpeg',
              size: thumbInfo.size || 0,
              info: { w: manipResult.width, h: manipResult.height }
            };
          }
        } catch (e) {
          console.warn("⚠️ Không thể tạo thumbnail:", e);
        }

        // Hiển thị trạng thái gửi "lạc quan" lên màn hình của bạn trước
        const optimisticMessage = {
          id: tempEventId,
          sender: getMatrixClient().getUserId(),
          isMe: true,
          text: fileName,
          time: currentTimeStr,
          senderName: 'Tôi',
          msgType: isVideo ? 'm.video' : 'm.image',
          mediaUrl: asset.uri, 
          mxcUrl: null,
          status: 'sending',
          info: fileToUpload.info
        };

        setMessages(prev => [optimisticMessage, ...prev]);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

        // CHUẨN ĐƠN GIẢN HÓA: Thực hiện tuần tự trực tiếp, loại bỏ hoàn toàn setTimeout vô định hướng
        try {
          console.log("📡 Đang mã hóa dữ liệu nhị phân và gửi tuần tự...");
          const response = await mediaService.uploadFile(currentActiveRoomId!, fileToUpload, thumbnailData);
          
          if (response && response.mxcUrl) {
            const safeId = response.mxcUrl.replace(/[^a-zA-Z0-9]/g, '_');
            const prefix = isVideo ? 'vid_v3_' : 'img_v3_';
            const cacheUri = FileSystem.cacheDirectory + prefix + safeId + '.' + fileExtension;
            
            await FileSystem.copyAsync({ from: asset.uri, to: cacheUri }).catch(() => {});
            console.log("✅ Đã hoàn tất gán cache mồi sau upload:", cacheUri);
          }
        } catch (uploadErr) {
          console.error("❌ Gửi tệp lên server thất bại:", uploadErr);
          // Cập nhật trạng thái lỗi nếu cần
          setMessages(prev => prev.map(m => m.id === tempEventId ? { ...m, status: 'failed' } : m));
        }
      }
    } catch (e) {
      console.error("Lỗi chọn file tổng quan:", e);
    }
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

        const client = getMatrixClient();
        const tempTxnId = 'txn_' + Date.now();
        const date = new Date();
        const currentTimeStr = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
        
        const fakeTempMessage = {
          id: tempTxnId,
          sender: client?.getUserId() || '',
          isMe: true,
          text: file.name,
          fileName: file.name,
          time: currentTimeStr,
          senderName: 'Tôi',
          msgType: 'm.file',
          mediaUrl: file.uri,
          status: 'sending'
        };

        setMessages(prev => [fakeTempMessage, ...prev]);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

        setTimeout(() => {
          mediaService.uploadFile(currentActiveRoomId!, file).catch(err => {
            Alert.alert('Lỗi', 'Không thể gửi tài liệu: ' + err.message);
          });
        }, 0);
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
          type: 'audio/mp4',
          size: status.fileSize || 0,
          info: {
            duration: finalDurationMs
          }
        };

        const client = getMatrixClient();
        const tempTxnId = 'txn_' + Date.now();
        const date = new Date();
        const currentTimeStr = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
        
        const fakeTempMessage = {
          id: tempTxnId,
          sender: client?.getUserId() || '',
          isMe: true,
          text: 'Tin nhắn thoại',
          time: currentTimeStr,
          senderName: 'Tôi',
          msgType: 'm.audio',
          mediaUrl: uri,
          status: 'sending',
          info: file.info
        };

        setMessages(prev => [fakeTempMessage, ...prev]);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

        setTimeout(() => {
          mediaService.uploadFile(currentActiveRoomId, file).then((response: any) => {
            if (response && response.mxcUrl) {
              const safeId = response.mxcUrl.replace(/[^a-zA-Z0-9]/g, '_');
              const targetCacheUri = FileSystem.cacheDirectory + 'audio_v3_' + safeId + '.m4a';
              FileSystem.copyAsync({ from: uri, to: targetCacheUri }).catch(() => { });
            }
          })
          .catch(err => {
            Alert.alert('Lỗi', 'Không thể gửi ghi âm: ' + err.message);
          });
        }, 0);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setRecording(null);
      setIsRecording(false);
      setRecordDuration(0);
    }
  };

  const playAudio = async (url: string, id: string, msgItem?: any, mxcUrl?: string | null) => {
    if (playingAudioId === id) {
      await audioPlayerRef.current?.stopAsync();
      setPlayingAudioId(null);
      setAudioProgress(null);
      return;
    }
    if (audioPlayerRef.current) {
      try {
        await audioPlayerRef.current.stopAsync();
        await audioPlayerRef.current.unloadAsync();
      } catch (e) { }
    }
    setAudioProgress({ id, progress: 0 });
    let errorCacheUri = "";
    try {
      const client = getMatrixClient();
      if (!client) return;

      let playUrl = "";
      const cacheKey = mxcUrl || url;
      const safeId = cacheKey.replace(/[^a-zA-Z0-9]/g, '_');

      let ext = '.m4a';
      if (msgItem?.info?.mimetype) {
        const mime = msgItem.info.mimetype.toLowerCase();
        if (mime.includes('ogg')) ext = '.ogg';
        else if (mime.includes('mp3') || mime.includes('mpeg')) ext = '.mp3';
        else if (mime.includes('wav')) ext = '.wav';
        else if (mime.includes('aac')) ext = '.aac';
      } else if (msgItem?.fileName) {
        const match = msgItem.fileName.match(/\.(\w+)$/);
        if (match) ext = '.' + match[1].toLowerCase();
      }

      const cacheUri = FileSystem.cacheDirectory + 'audio_v3_' + safeId + ext;
      errorCacheUri = cacheUri;
      const checkCache = await FileSystem.getInfoAsync(cacheUri);

      if (checkCache.exists) {
        playUrl = cacheUri;
      } else if (msgItem?.info?.encryptedFileInfo) {
        setIsLoadingHistory(true);

        try {
          const encryptedFileInfo = msgItem.info.encryptedFileInfo;

          await decryptMatrixFile(encryptedFileInfo, cacheUri);

          playUrl = cacheUri;
        } catch (decryptError) {
          console.error("Lỗi giải mã E2EE, thử nghiệm luồng fallback tải trực tiếp...", decryptError);
          let downloadUrl = url.startsWith('mxc://') ? client.mxcUrlToHttp(url) : url;
          if (!downloadUrl) throw new Error("Không thể phân giải mã URL từ server");
          downloadUrl = downloadUrl.replace(/\/_matrix\/media\/(r0|v3)\/(download|thumbnail)\//, '/_matrix/client/v1/media/$2/');

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
        downloadUrl = downloadUrl.replace(/\/_matrix\/media\/(r0|v3)\/(download|thumbnail)\//, '/_matrix/client/v1/media/$2/');

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
        if (status.isLoaded) {
          if (status.durationMillis) {
            setAudioProgress({ id, progress: status.positionMillis / status.durationMillis });
          }
          if (status.didJustFinish) {
            setPlayingAudioId(null);
            setAudioProgress(null);
          }
        }
      });
    } catch (e: any) {
      console.error("Lỗi phát audio chi tiết:", e);
      if (errorCacheUri) {
        FileSystem.deleteAsync(errorCacheUri, { idempotent: true }).catch(() => { });
      }
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
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      setIsUiReady(true);

      const client = getMatrixClient();
      if (client && currentActiveRoomId) {
        const room = client.getRoom(currentActiveRoomId);
        if (room) {
          let avatarUrl = room.getAvatarUrl(client.getHomeserverUrl(), 96, 96, 'crop', false, false);
          if (avatarUrl) {
            avatarUrl = avatarUrl.replace(/\/_matrix\/media\/(r0|v3)\/(download|thumbnail)\//, '/_matrix/client/v1/media/$2/');
          }
          setRoomInfo({
            name: room.name || 'Phòng chat',
            avatar: avatarUrl || CONTACTS.kael.avatar,
            members: room.getJoinedMemberCount() || 0
          });
        }
      }

      const allMessages = getRoomMessages();
      setMessages(allMessages.reverse());
    });

    return () => interactionPromise.cancel();
  }, []);

  useEffect(() => {
    const client = getMatrixClient();
    if (!client || !currentActiveRoomId) return;
    const room = client.getRoom(currentActiveRoomId);
    if (!room) return;

    const onTimelineEvent = (event: any, roomObj: any, toStartOfTimeline: boolean) => {
      if (event.getRoomId() !== currentActiveRoomId) return;
      if (toStartOfTimeline && !isHistoryLoadingRef.current) return;

      setMessages(getRoomMessages().reverse());

      if (!toStartOfTimeline && room.timeline.length > 0) {
        client.sendReadReceipt(room.timeline[room.timeline.length - 1]);
      }
    };

    const onDecrypted = (event: any) => {
      if (event.getRoomId() === currentActiveRoomId) {
        setMessages(getRoomMessages().reverse());
      }
    };

    const onTyping = (event: any, member: any) => {
      if (member.roomId !== currentActiveRoomId) return;
      const members = room.getMembersWithMembership('join');
      const typing = members.filter((m: any) => m.typing && m.userId !== client.getUserId());
      setTypingUsers(typing.map((m: any) => m.name || m.userId.split(':')[0].replace('@', '')));
    };

    client.on('Room.timeline' as any, onTimelineEvent);
    client.on('Event.decrypted' as any, onDecrypted);
    client.on('RoomMember.typing' as any, onTyping);

    return () => {
      client.removeListener('Room.timeline' as any, onTimelineEvent);
      client.removeListener('Event.decrypted' as any, onDecrypted);
      client.removeListener('RoomMember.typing' as any, onTyping);
    };
  }, []);

  const loadMoreHistory = async () => {
    const client = getMatrixClient();
    if (!client || !currentActiveRoomId || isHistoryLoadingRef.current) return;
    const room = client.getRoom(currentActiveRoomId);
    
    if (room) {
      const timeline = room.getLiveTimeline();
      if (timeline.getPaginationToken("b")) {
        isHistoryLoadingRef.current = true;
        setIsLoadingHistory(true);
        try {
          await client.scrollback(room, 30);
          setMessages(getRoomMessages().reverse());
        } catch (err) {
          console.log("Lỗi tải lịch sử cuộn:", err);
        } finally {
          setIsLoadingHistory(false);
          isHistoryLoadingRef.current = false;
        }
      }
    }
  };

  // 🌟 1. SỬA LẠI HÀM HANDLEINPUTCHANGE (Chặn spam request typing)
  const handleInputChange = (text: string) => {
    setInputText(text);

    // Nếu text truyền vào bằng rỗng (do hàm handleSend clear ô nhập liệu), BỎ QUA KHÔNG GỬI API
    if (!text.trim()) return;

    const client = getMatrixClient();
    if (client && currentActiveRoomId) {
      const now = Date.now();
      
      // Chuẩn Element: Chỉ cho phép gọi API Typing lên server nếu lần gọi trước đó cách nhau trên 5 giây
      if (now - lastTypingSentRef.current > 5000) {
        lastTypingSentRef.current = now;
        client.sendTyping(currentActiveRoomId, true, 6000); // Báo gõ phím mồi
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        client.sendTyping(currentActiveRoomId, false);
        lastTypingSentRef.current = 0; // Reset mốc thời gian khi ngừng gõ
      }, 3000);
    }
  };

  // 🌟 2. SỬA LẠI HÀM HANDLESEND
  const handleSend = () => {
    const client = getMatrixClient();
    if (!inputText.trim() || !client || !currentActiveRoomId) return;

    const textToSend = inputText.trim();

    // Tắt trạng thái gõ phím ngay lập tức lập tức để dọn đường cho tin nhắn đi
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    client.sendTyping(currentActiveRoomId, false);
    lastTypingSentRef.current = 0; // Reset ref về 0 luôn

    // Xóa chữ trong ô input
    setInputText('');

    // Đẩy UI hiển thị "lạc quan" lên màn hình ngay trong 1ms
    const tempTxnId = 'txn_' + Date.now();
    const date = new Date();
    const currentTimeStr = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    
    const fakeTempMessage = {
      id: tempTxnId,
      sender: client.getUserId(),
      isMe: true,
      text: textToSend,
      time: currentTimeStr,
      senderName: 'Tôi',
      msgType: 'm.text',
      status: 'sending',
    };

    setMessages(prev => [fakeTempMessage, ...prev]);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    // Đẩy hàm gửi tin mã hóa chạy ngầm độc lập hoàn toàn, không dính líu đến render giao diện
    setTimeout(async () => {
      try {
        await matrixService.sendMessage(currentActiveRoomId, textToSend);
      } catch (err) {
        console.error("Gửi tin nhắn ngầm lỗi:", err);
      }
    }, 0);
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
          <MatrixImage url={msg.mediaUrl} client={client} info={msg.info} eventId={msg.id} mxcUrl={msg.mxcUrl} fileName={msg.fileName} />
        </View>
      );
    }
    if (msg.msgType === 'm.audio' && msg.mediaUrl) {
      const isPlaying = playingAudioId === msg.id;
      const progress = isPlaying && audioProgress?.id === msg.id ? audioProgress.progress * 100 : 0;

      let displaySecs = msg.info?.duration ? Math.round(msg.info.duration / 1000) : 0;
      if (isPlaying && audioProgress?.id === msg.id) {
        displaySecs = Math.floor((audioProgress.progress * (msg.info?.duration || 0)) / 1000);
      }

      return (
        <TouchableOpacity onPress={() => playAudio(msg.mediaUrl, msg.id, msg, msg.mxcUrl)} className="flex-row items-center gap-3 w-48 py-1">
          <View className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.isMe ? 'bg-background/20' : 'bg-primary/20'}`}>
            {isPlaying ? <View className="w-3 h-3 bg-white rounded-sm" /> : <Play size={20} color={msg.isMe ? "#fff" : "#dcb8ff"} style={{ marginLeft: 3 }} />}
          </View>
          <View className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <View className="h-full bg-white" style={{ width: `${progress}%` }} />
          </View>
          <Text className="text-white text-xs">{formatDurationStr(displaySecs)}</Text>
        </TouchableOpacity>
      );
    }
    if (msg.msgType === 'm.video' && msg.mediaUrl) {
      return (
        <View className="overflow-hidden rounded-lg bg-black">
          <MatrixVideo url={msg.mediaUrl} client={client} info={msg.info} eventId={msg.id} mxcUrl={msg.mxcUrl} fileName={msg.fileName} />
        </View>
      );
    }
    if (msg.msgType === 'm.file') {
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
      <Header blurIntensity={100}>
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
          <TouchableOpacity onPress={() => voipService.placeCall(currentActiveRoomId || '', 'voice')} className="mr-6">
            <Phone size={24} color="#a0a0a0" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => voipService.placeCall(currentActiveRoomId || '', 'video')}>
            <Video size={24} color="#a0a0a0" />
          </TouchableOpacity>
        </View>
      </Header>

      {!isUiReady ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#dcb8ff" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={(item, index) => item.id || String(index)}
          onScroll={(e) => {
            setShowScrollDown(e.nativeEvent.contentOffset.y > 300);
          }}
          scrollEventThrottle={16}
          onEndReached={loadMoreHistory}
          onEndReachedThreshold={0.1}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}
          ListFooterComponent={() => (
            <>
              {isLoadingHistory && <ActivityIndicator size="small" color="#dcb8ff" className="my-4" />}
              <View className="h-24" /> 
            </>
          )}
          ListHeaderComponent={() => (
            typingUsers.length > 0 ? (
              <View className="flex-row items-center mt-2 mb-2 ml-2">
                <Text className="text-xs text-gray-400 italic">
                  {typingUsers.length > 2 ? "Nhiều người đang nhập..." : `${typingUsers.join(', ')} đang nhập...`}
                </Text>
              </View>
            ) : null
          )}
          renderItem={({ item: msg }) => {
            const isMedia = msg.msgType === 'm.image' || msg.msgType === 'm.video';
            return msg.isMe ? (
              <View className="flex-col items-end max-w-[85%] self-end mb-4">
                <View className={`${isMedia ? '' : 'bg-bubble p-3'} rounded-xl rounded-tr-none shadow-lg`}>
                  {renderMessageContent(msg)}
                </View>
                <View className="flex-row items-center gap-1 mt-1 mr-1">
                  <Text className="text-[10px] text-gray-500">{msg.time}</Text>
                  {msg.status === 'sending' ? (
                    <ActivityIndicator size="small" color="#00fbfb" style={{ width: 14, height: 14, transform: [{ scale: 0.6 }] }} />
                  ) : (
                    <CheckCheck size={14} color="#00fbfb" />
                  )}
                </View>
              </View>
            ) : (
              <View className="flex-col items-start max-w-[85%] mb-4">
                <Text className="text-xs text-gray-400 mb-1 ml-1">{msg.senderName}</Text>
                <View className={`${isMedia ? '' : 'bg-card p-3 border border-white/5'} rounded-xl rounded-tl-none shadow-sm`}>
                  {renderMessageContent(msg)}
                </View>
                <Text className="text-[10px] mt-1 text-gray-500 ml-1">{msg.time}</Text>
              </View>
            );
          }}
        />
      )}

      {showScrollDown && (
        <TouchableOpacity 
          className="absolute right-5 w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-white/10 shadow-xl z-[100]"
          style={{ bottom: 90 }}
          onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
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
                    if (showScrollDown) {
                      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
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
