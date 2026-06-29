import { EventEmitter } from 'events';
import { matrixService, getMatrixClient } from './MatrixService';

class VoipService extends EventEmitter {
    public activeCall: any = null;

    async placeCall(roomId: string, type: 'voice' | 'video' = 'voice') {
        const client = getMatrixClient();
        if (!client) return;
        const call = client.createCall(roomId);
        if (!call) return;
        this.handleNewCall(call, false, type);
    }

    handleNewCall(call: any, isIncoming: boolean, type: 'voice' | 'video' = 'voice') {
        this.activeCall = call;

        const updateUI = () => {
            if (!this.activeCall) {
                this.emit('call.update', null);
                return;
            }
            const data = {
                id: call.callId,
                roomId: call.roomId,
                type: call.type || type,
                state: call.state,
                isIncoming: isIncoming && call.state === 'ringing',
                localStream: call.localUsermediaStream || call.localStream,
                remoteStream: call.remoteUsermediaStream || call.remoteStream,
            };
            this.emit('call.update', data);
        };

        call.on('state', (state: string) => {
            if (state === 'ended') this.activeCall = null;
            updateUI();
        });

        call.on('local_stream', (stream: any) => { this.emit('call.local_stream', stream); updateUI(); });
        call.on('remote_stream', (stream: any) => { this.emit('call.remote_stream', stream); updateUI(); });

        call.on('error', (err: any) => {
            console.error("Lỗi WebRTC/Call:", err);
            this.hangupCall();
        });

        if (!isIncoming) {
            if (type === 'video') call.placeVideoCall();
            else call.placeVoiceCall();
        }
        updateUI();
    }

    answerCall() {
        if (this.activeCall && this.activeCall.state === 'ringing') this.activeCall.answer();
    }

    hangupCall() {
        if (this.activeCall) {
            this.activeCall.hangup();
            this.activeCall = null;
            this.emit('call.update', null);
        }
    }
}

export const voipService = new VoipService();
