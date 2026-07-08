import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
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
        
        if (isHost) {
            onClose(true);
        } else {
            onClose(false);
        }
    };

    return (
        <SafeAreaView style={[StyleSheet.absoluteFill, styles.container, { zIndex: 99999 }]} edges={['top', 'bottom', 'left', 'right']}>
            {isReady && (
                <JitsiMeeting
                    eventListeners={{
                        onReadyToClose: () => {
                            console.log("[Jitsi] onReadyToClose fired!");
                            handleExit();
                        },
                        onConferenceLeft: () => {
                            console.log("[Jitsi] onConferenceLeft fired!", arguments);
                            handleExit();
                        },
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

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1e1e1e',
    }
});


