import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Dimensions, Image, Modal, Animated } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Minimize2, Volume2, VolumeX } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import { getMatrixClient } from '../services/MatrixService';
import { voipService } from '../services/VoipService';
import { CONTACTS } from '../data';

const { width, height } = Dimensions.get('window');

export function CallScreen({ activeCall, onMinimize }: { activeCall: any, onMinimize: () => void }) {
    const [localStream, setLocalStream] = useState<any>(null);
    const [remoteStream, setRemoteStream] = useState<any>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
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
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                playThroughEarpieceAndroid: !newState,
            });
        } catch (e) {
            console.error("Lỗi chuyển loa:", e);
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

        voipService.on('call.local_stream', onLocalStream);
        voipService.on('call.remote_stream', onRemoteStream);

        return () => {
            voipService.removeListener('call.local_stream', onLocalStream);
            voipService.removeListener('call.remote_stream', onRemoteStream);
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
                    playThroughEarpieceAndroid: false,
                });

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
        return () => { if (soundRef.current) { soundRef.current.stopAsync().catch(()=>{}); soundRef.current.unloadAsync().catch(()=>{}); } };
    }, [activeCall?.state, activeCall?.isIncoming]);

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
            <View className="flex-1 bg-[#15191E] z-[1000]">
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
                    <View className="absolute w-full h-full bg-[#15191E] overflow-hidden items-center justify-center">
                        <View className="absolute top-0 -left-20 w-96 h-96 bg-[#0DBD8B]/10 rounded-full blur-[100px]" />
                        <View className="absolute bottom-0 -right-20 w-96 h-96 bg-[#03B381]/10 rounded-full blur-[100px]" />
                        
                        {/* Voice Call Avatar Center */}
                        <View className="items-center justify-center mb-10 z-10">
                            <View className="relative items-center justify-center mb-8">
                                <Animated.View 
                                    className={`absolute w-44 h-44 rounded-full border border-primary/20 bg-primary/5 ${activeCall.state === 'connected' ? 'opacity-100' : 'opacity-0'}`} 
                                    style={{ transform: [{ scale: scaleAnim }] }}
                                />
                                <View className="w-36 h-36 rounded-full border-2 border-primary/30 p-1 bg-surface z-10 shadow-2xl shadow-primary/20">
                                    <View className="w-full h-full rounded-full border-4 border-background overflow-hidden">
                                        <Image source={{ uri: roomInfo.avatar }} className="w-full h-full" />
                                    </View>
                                </View>
                            </View>

                            <Text className="text-white text-3xl font-extrabold mb-2 tracking-wide text-center px-4">
                                {roomInfo.name}
                            </Text>
                            <Text className="text-primary font-bold text-xs uppercase tracking-widest mb-2">
                                {activeCall.isIncoming ? 'Cuộc gọi đến' : (isVideoMode ? 'Cuộc gọi Video' : 'Cuộc gọi Thoại')}
                            </Text>
                            <Text className="text-gray-400 text-base font-medium">
                                {renderCallStatus()}
                            </Text>
                        </View>
                    </View>
                )}
                
                {/* Local Video PiP Layer */}
                {localStream && isVideoMode && !isVideoMuted && (
                    <View className="absolute top-28 right-5 w-28 h-40 rounded-2xl overflow-hidden bg-[#22262E] border-2 border-white/20 shadow-2xl z-50">
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
                    <View className="px-5 py-4 flex-row justify-between items-center mt-2">
                        <TouchableOpacity onPress={onMinimize} className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-md">
                            <Minimize2 size={24} color="#0DBD8B" />
                        </TouchableOpacity>
                        {remoteStream && isVideoMode && (
                            <View className="bg-black/50 px-5 py-2 rounded-full border border-white/10 flex-col items-center backdrop-blur-md shadow-lg shadow-black/50">
                                <Text className="text-white font-bold text-sm mb-0.5">{roomInfo.name}</Text>
                                <Text className="text-primary text-[10px] font-medium">{renderCallStatus()}</Text>
                            </View>
                        )}
                        <View className="w-12 h-12" />
                    </View>
                </SafeAreaView>

                {/* Bottom Controls */}
                <View className="absolute bottom-10 left-6 right-6 z-50">
                    <BlurView intensity={60} tint="dark" className="rounded-[36px] border border-white/10 overflow-hidden px-6 py-5 flex-row justify-between items-center bg-black/30 shadow-2xl">
                        {activeCall.isIncoming && activeCall.state === 'ringing' ? (
                            <View className="w-full flex-row justify-around items-center px-4">
                                <TouchableOpacity onPress={hangup} className="w-16 h-16 rounded-full flex items-center justify-center bg-[#ff4a4a] shadow-lg shadow-[#ff4a4a]/40">
                                    <PhoneOff size={28} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => voipService.answerCall()} className="w-16 h-16 rounded-full flex items-center justify-center bg-[#03B381] shadow-lg shadow-[#03B381]/40">
                                    <Phone size={28} color="#15191E" fill="#15191E" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="w-full flex-row justify-around items-center">
                                <TouchableOpacity onPress={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-white shadow-lg shadow-white/30' : 'bg-black/40 border border-white/10'}`}>
                                    {isMuted ? <MicOff size={24} color="#22262E" /> : <Mic size={24} color="#0DBD8B" />}
                                </TouchableOpacity>

                                <TouchableOpacity onPress={toggleSpeaker} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isSpeakerOn ? 'bg-white shadow-lg shadow-white/30' : 'bg-black/40 border border-white/10'}`}>
                                    {isSpeakerOn ? <Volume2 size={24} color="#22262E" /> : <VolumeX size={24} color="#0DBD8B" />}
                                </TouchableOpacity>

                                {isVideoMode && (
                                    <TouchableOpacity onPress={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoMuted ? 'bg-white shadow-lg shadow-white/30' : 'bg-black/40 border border-white/10'}`}>
                                        {isVideoMuted ? <VideoOff size={24} color="#22262E" /> : <Video size={24} color="#03B381" />}
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity onPress={hangup} className="w-16 h-14 rounded-full flex items-center justify-center bg-[#ff4a4a] shadow-lg shadow-[#ff4a4a]/30">
                                    <PhoneOff size={24} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </BlurView>
                </View>
            </View>
        </Modal>
    );
}
