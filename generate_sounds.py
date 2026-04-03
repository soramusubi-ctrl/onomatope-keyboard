#!/usr/bin/env python3
"""
オノマトペキーボード音 - 効果音生成スクリプト
各モード × キー種別ごとにWAVファイルを生成する
"""

import numpy as np
import wave
import struct
import os
import math

SAMPLE_RATE = 44100
OUTPUT_DIR = "/home/ubuntu/onomatope-keyboard/assets/sounds"

def write_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """サンプルデータをWAVファイルに書き込む"""
    samples = np.clip(samples, -1.0, 1.0)
    samples_int16 = (samples * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        f.writeframes(samples_int16.tobytes())

def envelope(t, attack=0.005, decay=0.05, sustain=0.6, release=0.1, total=0.3):
    """ADSRエンベロープ"""
    env = np.zeros_like(t)
    a_end = attack
    d_end = attack + decay
    s_end = total - release
    
    mask_a = t < a_end
    mask_d = (t >= a_end) & (t < d_end)
    mask_s = (t >= d_end) & (t < s_end)
    mask_r = t >= s_end
    
    env[mask_a] = t[mask_a] / attack
    env[mask_d] = 1.0 - (1.0 - sustain) * (t[mask_d] - a_end) / decay
    env[mask_s] = sustain
    env[mask_r] = sustain * (1.0 - (t[mask_r] - s_end) / release)
    return np.clip(env, 0, 1)

def sine_wave(t, freq):
    return np.sin(2 * np.pi * freq * t)

def square_wave(t, freq):
    return np.sign(np.sin(2 * np.pi * freq * t)) * 0.3

def sawtooth_wave(t, freq):
    return (2 * (t * freq - np.floor(t * freq + 0.5))) * 0.5

def noise(t):
    return np.random.uniform(-1, 1, len(t))

def chirp(t, f0, f1):
    """周波数スイープ"""
    k = (f1 - f0) / (t[-1] if len(t) > 0 else 1)
    return np.sin(2 * np.pi * (f0 * t + 0.5 * k * t**2))

# ============================================================
# おとなしいモード (quiet) - 控えめで上品な音
# ============================================================

def make_quiet_char_1():
    """ぽ - 柔らかいポップ音"""
    dur = 0.2
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    freq = 880
    s = sine_wave(t, freq) * 0.5
    env = envelope(t, attack=0.003, decay=0.03, sustain=0.4, release=0.1, total=dur)
    return s * env * 0.6

def make_quiet_char_2():
    """ぴ - 高めの短いクリック"""
    dur = 0.15
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = chirp(t, 1200, 800) * 0.4
    env = envelope(t, attack=0.002, decay=0.02, sustain=0.3, release=0.08, total=dur)
    return s * env * 0.5

def make_quiet_char_3():
    """こ - 低めのコツン"""
    dur = 0.18
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = sine_wave(t, 440) * 0.4 + sine_wave(t, 880) * 0.2
    env = envelope(t, attack=0.003, decay=0.04, sustain=0.2, release=0.1, total=dur)
    return s * env * 0.55

def make_quiet_space():
    """ふわ - 柔らかいスペース音"""
    dur = 0.25
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = chirp(t, 600, 400) * 0.5
    env = envelope(t, attack=0.02, decay=0.05, sustain=0.5, release=0.1, total=dur)
    return s * env * 0.5

def make_quiet_enter():
    """ぽん - エンター音"""
    dur = 0.3
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = sine_wave(t, 523) * 0.5 + sine_wave(t, 659) * 0.3
    env = envelope(t, attack=0.005, decay=0.05, sustain=0.4, release=0.15, total=dur)
    return s * env * 0.6

def make_quiet_backspace():
    """すっ - バックスペース音"""
    dur = 0.2
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = chirp(t, 800, 400) * 0.4
    env = envelope(t, attack=0.003, decay=0.03, sustain=0.3, release=0.1, total=dur)
    return s * env * 0.5

def make_quiet_modifier():
    """ちっ - 修飾キー音"""
    dur = 0.15
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = sine_wave(t, 1046) * 0.3
    env = envelope(t, attack=0.002, decay=0.02, sustain=0.2, release=0.08, total=dur)
    return s * env * 0.4

# ============================================================
# たのしいモード (fun) - 明るくポップな音
# ============================================================

def make_fun_char_1():
    """ぽぽ - 弾むポップ"""
    dur = 0.25
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = chirp(t, 600, 1200) * 0.5 + sine_wave(t, 880) * 0.3
    env = envelope(t, attack=0.003, decay=0.04, sustain=0.5, release=0.1, total=dur)
    return s * env * 0.65

def make_fun_char_2():
    """きゅ - 上昇音"""
    dur = 0.2
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = chirp(t, 400, 1000) * 0.5
    env = envelope(t, attack=0.003, decay=0.03, sustain=0.5, release=0.08, total=dur)
    return s * env * 0.6

def make_fun_char_3():
    """ぴこ - ゲーム風"""
    dur = 0.2
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = square_wave(t, 880) * 0.4 + square_wave(t, 1100) * 0.2
    env = envelope(t, attack=0.002, decay=0.03, sustain=0.4, release=0.1, total=dur)
    return s * env * 0.55

def make_fun_space():
    """ぽわーん - 広がるスペース"""
    dur = 0.35
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = chirp(t, 300, 800) * 0.5 + sine_wave(t, 600) * 0.3
    env = envelope(t, attack=0.01, decay=0.06, sustain=0.5, release=0.15, total=dur)
    return s * env * 0.6

def make_fun_enter():
    """ぴんぽーん - 正解音"""
    dur = 0.4
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    # 二音符
    t1 = t[t < 0.2]
    t2 = t[t >= 0.2] - 0.2
    s1 = sine_wave(t1, 784) * envelope(t1, attack=0.005, decay=0.04, sustain=0.5, release=0.08, total=0.2)
    s2 = sine_wave(t2, 1046) * envelope(t2, attack=0.005, decay=0.04, sustain=0.5, release=0.1, total=0.2)
    s = np.concatenate([s1, s2]) * 0.6
    return s

def make_fun_backspace():
    """ぴゅ - 消去音"""
    dur = 0.22
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = chirp(t, 1200, 400) * 0.5
    env = envelope(t, attack=0.003, decay=0.04, sustain=0.3, release=0.1, total=dur)
    return s * env * 0.6

def make_fun_modifier():
    """ぴっ - 修飾キー"""
    dur = 0.18
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = square_wave(t, 1200) * 0.3 + sine_wave(t, 1200) * 0.3
    env = envelope(t, attack=0.002, decay=0.03, sustain=0.3, release=0.08, total=dur)
    return s * env * 0.5

# ============================================================
# えへ系モード (ehe) - 可愛い・照れ系
# ============================================================

def make_ehe_char_1():
    """えへ - 照れ声風"""
    dur = 0.3
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    # ビブラート
    vib = 1 + 0.02 * np.sin(2 * np.pi * 6 * t)
    s = np.sin(2 * np.pi * 700 * t * vib) * 0.5
    env = envelope(t, attack=0.01, decay=0.05, sustain=0.5, release=0.12, total=dur)
    return s * env * 0.6

def make_ehe_char_2():
    """にゃ - 猫っぽい"""
    dur = 0.25
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = chirp(t, 500, 900) * 0.4 + sine_wave(t, 700) * 0.3
    env = envelope(t, attack=0.008, decay=0.04, sustain=0.5, release=0.1, total=dur)
    return s * env * 0.55

def make_ehe_char_3():
    """ふふ - 笑い声風"""
    dur = 0.28
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    # 二段階
    t1 = t[t < 0.14]
    t2 = t[t >= 0.14] - 0.14
    s1 = sine_wave(t1, 600) * envelope(t1, attack=0.005, decay=0.03, sustain=0.4, release=0.06, total=0.14)
    s2 = sine_wave(t2, 650) * envelope(t2, attack=0.005, decay=0.03, sustain=0.4, release=0.06, total=0.14)
    return np.concatenate([s1, s2]) * 0.6

def make_ehe_space():
    """ほわ〜 - 癒し系スペース"""
    dur = 0.4
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    vib = 1 + 0.015 * np.sin(2 * np.pi * 5 * t)
    s = np.sin(2 * np.pi * 440 * t * vib) * 0.4 + sine_wave(t, 880) * 0.2
    env = envelope(t, attack=0.02, decay=0.06, sustain=0.5, release=0.15, total=dur)
    return s * env * 0.55

def make_ehe_enter():
    """やった〜 - 達成感"""
    dur = 0.45
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    freqs = [523, 659, 784, 1046]
    s = np.zeros(len(t))
    seg = len(t) // 4
    for i, freq in enumerate(freqs):
        start = i * seg
        end = min((i + 1) * seg, len(t))
        seg_t = t[start:end] - t[start]
        seg_s = sine_wave(seg_t, freq) * envelope(seg_t, attack=0.003, decay=0.02, sustain=0.5, release=0.05, total=seg_t[-1] if len(seg_t) > 0 else 0.1)
        s[start:end] = seg_s
    return s * 0.6

def make_ehe_backspace():
    """あれ〜 - 下降音"""
    dur = 0.3
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = chirp(t, 900, 300) * 0.5
    env = envelope(t, attack=0.005, decay=0.05, sustain=0.4, release=0.12, total=dur)
    return s * env * 0.55

def make_ehe_modifier():
    """ぴょ - 跳ねる音"""
    dur = 0.2
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = chirp(t, 800, 1200) * 0.4 + sine_wave(t, 1000) * 0.2
    env = envelope(t, attack=0.003, decay=0.03, sustain=0.4, release=0.08, total=dur)
    return s * env * 0.5

# ============================================================
# カオスモード (chaos) - 予測不能・笑える
# ============================================================

def make_chaos_char_1():
    """ぐわ - 歪んだ音"""
    dur = 0.3
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = sawtooth_wave(t, 220) * 0.5 + noise(t) * 0.1
    env = envelope(t, attack=0.003, decay=0.06, sustain=0.4, release=0.12, total=dur)
    return s * env * 0.6

def make_chaos_char_2():
    """びよーん - 伸縮音"""
    dur = 0.35
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = chirp(t, 200, 1500) * 0.5
    env = envelope(t, attack=0.005, decay=0.05, sustain=0.5, release=0.12, total=dur)
    return s * env * 0.65

def make_chaos_char_3():
    """ぴぴぴ - 連続ビープ"""
    dur = 0.3
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = np.zeros(len(t))
    beep_dur = 0.06
    for i in range(4):
        start = int(i * 0.075 * SAMPLE_RATE)
        end = int((i * 0.075 + beep_dur) * SAMPLE_RATE)
        if end <= len(t):
            bt = t[start:end] - t[start]
            freq = 800 + i * 200
            bs = sine_wave(bt, freq) * envelope(bt, attack=0.002, decay=0.01, sustain=0.5, release=0.02, total=beep_dur)
            s[start:end] = bs
    return s * 0.6

def make_chaos_space():
    """どーん - 爆発音"""
    dur = 0.4
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = noise(t) * 0.6 + sine_wave(t, 80) * 0.4
    env = envelope(t, attack=0.003, decay=0.08, sustain=0.3, release=0.2, total=dur)
    return s * env * 0.7

def make_chaos_enter():
    """じゃーん - ファンファーレ"""
    dur = 0.45
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = (sine_wave(t, 523) * 0.4 + 
         sine_wave(t, 659) * 0.3 + 
         sine_wave(t, 784) * 0.2 + 
         sawtooth_wave(t, 261) * 0.2)
    env = envelope(t, attack=0.005, decay=0.06, sustain=0.6, release=0.15, total=dur)
    return s * env * 0.65

def make_chaos_backspace():
    """ぐしゃ - 破壊音"""
    dur = 0.3
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    s = noise(t) * 0.5 + chirp(t, 1000, 100) * 0.4
    env = envelope(t, attack=0.003, decay=0.05, sustain=0.3, release=0.15, total=dur)
    return s * env * 0.65

def make_chaos_modifier():
    """ぴゅるるる - 奇妙な音"""
    dur = 0.35
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    vib = 1 + 0.3 * np.sin(2 * np.pi * 20 * t)
    s = np.sin(2 * np.pi * 600 * t * vib) * 0.5
    env = envelope(t, attack=0.003, decay=0.05, sustain=0.5, release=0.12, total=dur)
    return s * env * 0.6

# ============================================================
# 音声ファイル生成
# ============================================================

def generate_all_sounds():
    sounds = {
        # おとなしいモード
        "quiet/char_1": make_quiet_char_1,
        "quiet/char_2": make_quiet_char_2,
        "quiet/char_3": make_quiet_char_3,
        "quiet/space_1": make_quiet_space,
        "quiet/enter_1": make_quiet_enter,
        "quiet/backspace_1": make_quiet_backspace,
        "quiet/modifier_1": make_quiet_modifier,
        
        # たのしいモード
        "fun/char_1": make_fun_char_1,
        "fun/char_2": make_fun_char_2,
        "fun/char_3": make_fun_char_3,
        "fun/space_1": make_fun_space,
        "fun/enter_1": make_fun_enter,
        "fun/backspace_1": make_fun_backspace,
        "fun/modifier_1": make_fun_modifier,
        
        # えへ系モード
        "ehe/char_1": make_ehe_char_1,
        "ehe/char_2": make_ehe_char_2,
        "ehe/char_3": make_ehe_char_3,
        "ehe/space_1": make_ehe_space,
        "ehe/enter_1": make_ehe_enter,
        "ehe/backspace_1": make_ehe_backspace,
        "ehe/modifier_1": make_ehe_modifier,
        
        # カオスモード
        "chaos/char_1": make_chaos_char_1,
        "chaos/char_2": make_chaos_char_2,
        "chaos/char_3": make_chaos_char_3,
        "chaos/space_1": make_chaos_space,
        "chaos/enter_1": make_chaos_enter,
        "chaos/backspace_1": make_chaos_backspace,
        "chaos/modifier_1": make_chaos_modifier,
    }
    
    for name, func in sounds.items():
        path = os.path.join(OUTPUT_DIR, f"{name}.wav")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        samples = func()
        write_wav(path, samples)
        print(f"Generated: {path}")
    
    print(f"\n✅ {len(sounds)} sound files generated in {OUTPUT_DIR}")

if __name__ == "__main__":
    np.random.seed(42)
    generate_all_sounds()
