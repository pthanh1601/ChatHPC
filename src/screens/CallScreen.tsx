import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Dimensions, Image, Modal, Animated, Alert } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Minimize2, Volume2 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import InCallManager from 'react-native-incall-manager';
import { getMatrixClient } from '../services/MatrixService';
import { voipService } from '../services/VoipService';
import { CONTACTS } from '../data';

const { width, height } = Dimensions.get('window');

export function CallScreen({ activeCall, onMinimize }: { activeCall: any, onMinimize: () => void }) {
    const [localStream, setLocalStream] = useState<any>(null);
    const [remoteStream, setRemoteStream] = useState<any>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isVideoRequested, setIsVideoRequested] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(activeCall?.type === 'video');
    const [duration, setDuration] = useState(0);
    const [roomInfo, setRoomInfo] = useState({ name: 'Đang kết nối...', avatar: CONTACTS.aria.avatar });
    const soundRef = useRef<Audio.Sound | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const toggleSpeaker = async () => {
        const newState = !isSpeakerOn;
        setIsSpeakerOn(newState);
        try {
            InCallManager.setForceSpeakerphoneOn(newState);
        } catch (e) {
            console.error("Lỗi chuyển loa InCallManager:", e);
        }
    };

    useEffect(() => {
        if (activeCall?.state === 'connected' && activeCall?.type !== 'video') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
                ])
            ).start();
        } else {
            scaleAnim.stopAnimation();
            scaleAnim.setValue(1);
        }
    }, [activeCall?.state, activeCall?.type]);

    useEffect(() => {
        if (!activeCall) return;

        if (activeCall.localStream) setLocalStream(activeCall.localStream);
        if (activeCall.remoteStream) setRemoteStream(activeCall.remoteStream);

        const onLocalStream = (stream: any) => setLocalStream(stream);
        const onRemoteStream = (stream: any) => setRemoteStream(stream);

        const onUpgradeRequested = (content: any) => {
            Alert.alert(
                "Yêu cầu bật Video",
                "Đối phương muốn chuyển sang cuộc gọi video",
                [
                    { text: "Từ chối", onPress: () => voipService.rejectVideoUpgrade(), style: "cancel" },
                    { text: "Đồng ý", onPress: () => voipService.acceptVideoUpgrade() }
                ]
            );
        };

        const onUpgradeRejected = () => {
            Alert.alert("Bị từ chối", "Đối phương đã từ chối yêu cầu video của bạn.");
            setIsVideoRequested(false);
        };

        voipService.on('call.local_stream', onLocalStream);
        voipService.on('call.remote_stream', onRemoteStream);
        voipService.on('call.video_upgrade_requested', onUpgradeRequested);
        voipService.on('call.video_upgrade_rejected', onUpgradeRejected);

        return () => {
            voipService.removeListener('call.local_stream', onLocalStream);
            voipService.removeListener('call.remote_stream', onRemoteStream);
            voipService.removeListener('call.video_upgrade_requested', onUpgradeRequested);
            voipService.removeListener('call.video_upgrade_rejected', onUpgradeRejected);
        };
    }, [activeCall]);

    useEffect(() => {
        if (!activeCall?.roomId) return;
        const client = getMatrixClient();
        if (!client) return;
        const room = client.getRoom(activeCall.roomId);
        if (room) {
            setRoomInfo({
                name: room.name || 'Cuộc gọi',
                avatar: room.getAvatarUrl(client.getHomeserverUrl(), 256, 256, 'crop', false, false) || CONTACTS.aria.avatar
            });
        }
    }, [activeCall?.roomId]);

    useEffect(() => {
        const handleAudio = async () => {
            try {
                if (soundRef.current) {
                    await soundRef.current.stopAsync();
                    await soundRef.current.unloadAsync();
                    soundRef.current = null;
                }

                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: true,
                });

                if (activeCall?.state === 'connected') {
                    InCallManager.start({ media: activeCall.type === 'video' ? 'video' : 'audio' });
                    InCallManager.setForceSpeakerphoneOn(activeCall.type === 'video');
                }

                if (activeCall?.isIncoming && activeCall?.state === 'ringing') {
                    // Đổ chuông báo người khác gọi đến
                    const { sound } = await Audio.Sound.createAsync(
                        { uri: 'https://raw.githubusercontent.com/matrix-org/matrix-react-sdk/master/res/media/ringtone.mp3' },
                        { shouldPlay: true, isLooping: true }
                    );
                    soundRef.current = sound;
                } else if (!activeCall?.isIncoming && activeCall?.state === 'invite_sent') {
                    // Đổ tiếng tút tút chờ người bên kia nhấc máy
                    const { sound } = await Audio.Sound.createAsync(
                        { uri: 'https://raw.githubusercontent.com/matrix-org/matrix-react-sdk/master/res/media/ringback.mp3' },
                        { shouldPlay: true, isLooping: true }
                    );
                    soundRef.current = sound;
                }
            } catch (error) {
                console.log("Lỗi phát âm thanh:", error);
            }
        };

        handleAudio();
        return () => { 
            if (soundRef.current) { 
                soundRef.current.stopAsync().catch(()=>{}); 
                soundRef.current.unloadAsync().catch(()=>{}); 
            }
            if (activeCall?.state === 'ended' || !activeCall) {
                InCallManager.stop();
            }
        };
    }, [activeCall?.state, activeCall?.isIncoming, activeCall?.type]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeCall?.state === 'connected' || activeCall?.state === 'connecting') {
            const start = activeCall.startTime || startTimeRef.current || Date.now();
            if (!startTimeRef.current) startTimeRef.current = start;
            
            interval = setInterval(() => {
                const now = Date.now();
                setDuration(Math.max(0, Math.floor((now - start) / 1000)));
            }, 1000);
        } else {
            startTimeRef.current = null;
            setDuration(0);
        }
        return () => clearInterval(interval);
    }, [activeCall?.state, activeCall?.startTime]);

    if (!activeCall) return null;

    const toggleMute = () => {
        const audioTracks = localStream?.getAudioTracks();
        if (audioTracks && audioTracks.length > 0) {
            audioTracks[0].enabled = isMuted; // Đảo ngược state của Track
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        const videoTracks = localStream?.getVideoTracks();
        if (videoTracks && videoTracks.length > 0) {
            videoTracks[0].enabled = isVideoMuted;
            setIsVideoMuted(!isVideoMuted);
        }
    };

    const hangup = () => {
        InCallManager.stop();
        voipService.hangupCall();
    };

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const renderCallStatus = () => {
        switch (activeCall.state) {
            case 'fledgling': return 'Đang khởi tạo...';
            case 'wait_local_media': return 'Đang lấy quyền Camera/Micro...';
            case 'create_offer': return 'Đang tạo kết nối...';
            case 'invite_sent': return 'Đang gọi...';
            case 'ringing': return 'Đang đổ chuông...';
            case 'connecting': return duration > 0 ? formatDuration(duration) : 'Đang kết nối...';
            case 'connected': return formatDuration(duration);
            default: return activeCall.isIncoming ? 'Đang gọi đến...' : `Trạng thái: ${activeCall.state}`;
        }
    };

    const isVideoMode = activeCall.type === 'video';

    return (
        <Modal visible={true} animationType="slide" transparent={false} onRequestClose={onMinimize}>
            <View className="flex-1 bg-black z-[1000]">
                {/* Background Layer */}
                {remoteStream && isVideoMode ? (
                    <View className="absolute w-full h-full bg-black">
                        <RTCView
                            streamURL={remoteStream.toURL()}
                            style={{ width: width, height: height }}
                            objectFit="cover"
                        />
                    </View>
                ) : (
                    <View className="absolute w-full h-full bg-black overflow-hidden items-center justify-center">
                        {/* Voice Call Avatar Center */}
                        <View className="items-center justify-center mb-20 z-10">
                            <View className="relative items-center justify-center mb-6">
                                <View className="w-40 h-40 rounded-full overflow-hidden bg-[#2c2c2e] z-10">
                                    <Image source={{ uri: roomInfo.avatar }} className="w-full h-full" />
                                </View>
                            </View>

                            <Text className="text-white text-3xl font-bold mb-2 text-center px-4">
                                {roomInfo.name}
                            </Text>
                            <Text className="text-[#8e8e93] text-lg font-normal">
                                {renderCallStatus()}
                            </Text>
                        </View>
                    </View>
                )}
                
                {/* Local Video PiP Layer */}
                {localStream && isVideoMode && !isVideoMuted && (
                    <View className="absolute bottom-40 right-6 w-28 h-40 rounded-xl overflow-hidden bg-[#2c2c2e] z-50 shadow-lg">
                        <RTCView
                            streamURL={localStream.toURL()}
                            style={{ width: '100%', height: '100%' }}
                            objectFit="cover"
                            zOrder={1}
                        />
                    </View>
                )}

                {/* Top Header Controls */}
                <SafeAreaView className="absolute top-0 left-0 w-full z-50">
                    <View className="px-4 py-2 flex-row justify-between items-center mt-2">
                        <TouchableOpacity onPress={onMinimize} className="w-12 h-12 flex items-center justify-center">
                            <Minimize2 size={28} color="white" />
                        </TouchableOpacity>
                        {remoteStream && isVideoMode && (
                            <View className="bg-black/60 px-4 py-1.5 rounded-full flex-col items-center">
                                <Text className="text-white font-semibold text-sm">{roomInfo.name}</Text>
                                <Text className="text-[#8e8e93] text-[11px] font-medium">{renderCallStatus()}</Text>
                            </View>
                        )}
                        <View className="w-12 h-12" />
                    </View>
                </SafeAreaView>

                {/* Bottom Controls */}
                <View className="absolute bottom-12 left-0 right-0 w-full z-50">
                    {activeCall.isIncoming && activeCall.state === 'ringing' ? (
                        <View className="w-full flex-row justify-center items-center gap-16 px-6">
                            <TouchableOpacity onPress={hangup} className="w-16 h-16 rounded-full flex items-center justify-center bg-[#ff3b30]">
                                <PhoneOff size={28} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => voipService.answerCall()} className="w-16 h-16 rounded-full flex items-center justify-center bg-[#34c759]">
                                <Phone size={28} color="white" fill="white" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="w-full flex-row justify-evenly items-center px-4">
                            <TouchableOpacity onPress={toggleMute} className={`w-16 h-16 rounded-full flex items-center justify-center ${isMuted ? 'bg-white' : 'bg-[#2c2c2e]'}`}>
                                {isMuted ? <MicOff size={28} color="black" /> : <Mic size={28} color="white" />}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={toggleSpeaker} className={`w-16 h-16 rounded-full flex items-center justify-center ${isSpeakerOn ? 'bg-white' : 'bg-[#2c2c2e]'}`}>
                                <Volume2 size={28} color={isSpeakerOn ? "black" : "white"} />
                            </TouchableOpacity>

                            {isVideoMode && (
                                <TouchableOpacity onPress={toggleVideo} className={`w-16 h-16 rounded-full flex items-center justify-center ${isVideoMuted ? 'bg-white' : 'bg-[#2c2c2e]'}`}>
                                    {isVideoMuted ? <VideoOff size={28} color="black" /> : <Video size={28} color="white" />}
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity onPress={hangup} className="w-16 h-16 rounded-full flex items-center justify-center bg-[#ff3b30]">
                                <PhoneOff size={28} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}
