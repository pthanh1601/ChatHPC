import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JitsiMeeting } from '@jitsi/react-native-sdk';
import { X } from 'lucide-react-native';
import { getMatrixClient } from '../services/MatrixService';

interface JitsiCallModalProps {
    visible: boolean;
    roomName: string;
    onClose: (isEndedForAll?: boolean) => void;
    serverURL?: string;
    token?: string;
    isHost?: boolean;
}

export function JitsiCallModal({ visible, roomName, onClose, serverURL = 'https://jitsi.5hpc.com', token, isHost }: JitsiCallModalProps) {
    const [isReady, setIsReady] = useState(false);
    const hasPrompted = React.useRef(false);
    const remoteParticipants = React.useRef<Set<string>>(new Set());

    useEffect(() => {
        if (visible) {
            hasPrompted.current = false;
            // Wait for Modal slide animation to complete before mounting heavy Jitsi Native View
            const timer = setTimeout(() => setIsReady(true), 500);
            return () => clearTimeout(timer);
        } else {
            setIsReady(false);
        }
    }, [visible]);

    if (!visible) return null;

    // Clean up room name to be a valid Jitsi room (alphanumeric)
    const cleanRoomName = roomName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const finalRoomName = cleanRoomName.length > 0 ? cleanRoomName : 'ChatHPCRoom';

    const client = getMatrixClient();
    const userId = client?.getUserId() || '';
    const user = client ? client.getUser(userId) : null;
    const displayName = user?.displayName || 'ChatHPC User';
    const avatarUrl = user?.avatarUrl ? client?.mxcUrlToHttp(user.avatarUrl) : '';

    const handleExit = () => {
        if (hasPrompted.current) return;
        hasPrompted.current = true;

        // Default to "Leave temporarily" to prevent Jitsi's native "Leave" button from accidentally ending the call.
        // To officially end the call for all, the Host must use the "Kết thúc" banner in ChatSingle.
        onClose(false);
    };

    return (
        <SafeAreaView style={[StyleSheet.absoluteFill, styles.container, { zIndex: 99999 }]} edges={['top', 'bottom', 'left', 'right']}>
            {isReady && (
                <JitsiMeeting
                    eventListeners={{
                        onReadyToClose: () => {
                            console.log("[Jitsi] onReadyToClose fired!");
                            // Delay slightly to ensure onParticipantLeft events have time to arrive if "End for all" was clicked
                            setTimeout(() => handleExit(), 500);
                        },
                        onConferenceLeft: () => {
                            console.log("[Jitsi] onConferenceLeft fired!");
                            setTimeout(() => handleExit(), 500);
                        },
                        onParticipantJoined: (participant: any) => {
                            const pid = participant?.participantId || participant?.id;
                            if (pid) {
                                remoteParticipants.current.add(pid);
                            }
                        },
                        onParticipantLeft: (participant: any) => {
                            const pid = participant?.participantId || participant?.id;
                            if (pid) {
                                remoteParticipants.current.delete(pid);
                            }
                        }
                    }}
                    room={finalRoomName}
                    serverURL={serverURL}
                    token={token}
                    userInfo={{
                        displayName: displayName,
                        ...(avatarUrl ? { avatarURL: avatarUrl } : {})
                    }}
                    flags={{
                        'prejoinpage.enabled': false,
                        'welcomepage.enabled': false,
                        'invite.enabled': false
                    }}
                    config={{
                        prejoinPageEnabled: false
                    }}
                    style={{ flex: 1 }}
                />
            )}
            
            {/* Custom Overlay Button for "Leave temporarily" */}
            <TouchableOpacity 
                style={styles.leaveTempButton}
                onPress={() => {
                    if (hasPrompted.current) return;
                    hasPrompted.current = true;
                    onClose(false); // Force leave temporarily
                }}
            >
                <Text style={styles.leaveTempText}>Rời tạm thời</Text>
            </TouchableOpacity>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    leaveTempButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        zIndex: 999999,
    },
    leaveTempText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    container: {
        flex: 1,
        backgroundColor: '#1e1e1e',
    }
});


