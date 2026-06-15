import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PluginManager, PluginCommAPI, PluginNoteAPI } from 'sn-plugin-lib';
import { parseDiceNotation, RollResult, DieResult } from './src/diceUtils';
import DiceFace from './src/DiceFace';

const ANIMATION_PREF_KEY = '@dice_roll:animation_enabled';
const LASSO_BUTTON_ID = 200;
const SELECTION_BUTTON_ID = 300;

const ANIMATION_FRAMES = 5;
const ANIMATION_FRAME_MS = 180;

function randomFace(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export default function App(): React.JSX.Element {
  const [notation, setNotation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RollResult | null>(null);
  const [animationEnabled, setAnimationEnabled] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedDice, setAnimatedDice] = useState<DieResult[]>([]);
  const pendingResult = useRef<RollResult | null>(null);

  // Load animation preference on mount
  useEffect(() => {
    AsyncStorage.getItem(ANIMATION_PREF_KEY).then(val => {
      if (val !== null) setAnimationEnabled(val === 'true');
    });
  }, []);

  // Register lasso / selection button listener
  useEffect(() => {
    const sub = PluginManager.registerButtonListener({
      onButtonPress: async (msg: { id: number }) => {
        if (msg.id !== LASSO_BUTTON_ID && msg.id !== SELECTION_BUTTON_ID) return;
        try {
          const elementsRes = await PluginCommAPI.getLassoElements();
          if (!elementsRes?.success || !elementsRes.result?.length) return;
          const recognRes = await PluginCommAPI.recognizeElements(
            elementsRes.result,
            { width: 1600, height: 1872 },
          );
          const recognized = String(recognRes?.result ?? '');
          const trimmed = recognized.trim();
          if (!trimmed) {
            setNotation('');
            setError('OCR failed to detect text');
            return;
          }
          setNotation(trimmed);
          setError(null);
        } catch {
          // Silently ignore — user can type manually
        }
      },
    });
    return () => sub?.remove?.();
  }, []);

  const handleRoll = useCallback(
    (inputNotation?: string) => {
      const input = (inputNotation ?? notation).trim();
      setError(null);
      const parsed = parseDiceNotation(input);
      if (!parsed.ok) {
        setError(parsed.error.message);
        setResult(null);
        return;
      }
      if (!animationEnabled) {
        setResult(parsed.result);
        return;
      }
      pendingResult.current = parsed.result;
      setIsAnimating(true);
      setResult(null);
      const dice = parsed.result.dice;
      let frame = 0;
      const tick = setInterval(() => {
        setAnimatedDice(dice.map(d => ({ ...d, value: randomFace(d.sides) })));
        frame++;
        if (frame >= ANIMATION_FRAMES) {
          clearInterval(tick);
          setIsAnimating(false);
          setResult(pendingResult.current);
          setAnimatedDice([]);
        }
      }, ANIMATION_FRAME_MS);
    },
    [notation, animationEnabled],
  );

  const toggleAnimation = useCallback(async () => {
    const next = !animationEnabled;
    setAnimationEnabled(next);
    await AsyncStorage.setItem(ANIMATION_PREF_KEY, String(next));
  }, [animationEnabled]);

  const handleCopyTotal = useCallback(() => {
    if (!result) return;
    Clipboard.setString(String(result.total));
    PluginManager.closePluginView();
  }, [result]);

  const d6Faces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  const getDiceText = useCallback(() => {
    if (!result) return '';
    return result.dice
      .map(d => d.sides === 6 && d.value <= 6 ? d6Faces[d.value] : `[d${d.sides}:${d.value}]`)
      .join(' ');
  }, [result]);

  const handleCopyDice = useCallback(() => {
    if (!result) return;
    Clipboard.setString(getDiceText());
    PluginManager.closePluginView();
  }, [result, getDiceText]);

  const handleInsertTotal = useCallback(async () => {
    if (!result) return;
    await PluginNoteAPI.insertText({
      textContentFull: String(result.total),
      textRect: { left: 100, top: 100, right: 500, bottom: 220 },
      fontSize: 72,
    });
    PluginManager.closePluginView();
  }, [result]);

  const handleInsertDice = useCallback(async () => {
    if (!result) return;
    await PluginNoteAPI.insertText({
      textContentFull: getDiceText(),
      textRect: { left: 100, top: 100, right: 1100, bottom: 220 },
      fontSize: 72,
    });
    PluginManager.closePluginView();
  }, [result, getDiceText]);

  const handleClose = useCallback(() => {
    PluginManager.closePluginView();
  }, []);

  const displayDice = isAnimating ? animatedDice : (result?.dice ?? []);
  const showResult = !isAnimating && result !== null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dice Roller</Text>
        <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={notation}
          onChangeText={(text) => {
            setNotation(text);
            if (error) setError(null);
          }}
          placeholder="Enter dice notation (e.g. 4d6, 2d20+3)"
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => handleRoll()}
          returnKeyType="go"
        />
        {notation.length > 0 ? (
          <Pressable
            style={styles.clearBtn}
            onPress={() => setNotation('')}
            hitSlop={8}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        style={[styles.rollBtn, isAnimating && styles.rollBtnDisabled]}
        onPress={() => handleRoll()}
        disabled={isAnimating}
      >
        <Text style={styles.rollBtnText}>
          {isAnimating ? 'Rolling...' : 'Roll'}
        </Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Animation toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Animation</Text>
        <Pressable
          style={[styles.toggle, animationEnabled && styles.toggleOn]}
          onPress={toggleAnimation}
        >
          <Text style={[styles.toggleText, animationEnabled && styles.toggleTextOn]}>{animationEnabled ? 'ON' : 'OFF'}</Text>
        </Pressable>
      </View>

      {/* Divider */}
      {(displayDice.length > 0 || showResult) ? (
        <View style={styles.divider} />
      ) : null}

      {/* Dice grid */}
      {displayDice.length > 0 ? (
        <View style={styles.diceGrid}>
          {displayDice.map((die, i) => (
            <DiceFace key={i} sides={die.sides} value={die.value} size={72} />
          ))}
        </View>
      ) : null}

      {/* Total */}
      {showResult && result ? (
        <>
          <Text style={styles.totalLabel}>
            Total: <Text style={styles.totalValue}>{result.total}</Text>
          </Text>

          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={handleCopyTotal}>
              <Text style={styles.actionBtnText}>Copy Total</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleCopyDice}>
              <Text style={styles.actionBtnText}>Copy Dice</Text>
            </Pressable>
          </View>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={handleInsertTotal}>
              <Text style={styles.actionBtnText}>Insert Total</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleInsertDice}>
              <Text style={styles.actionBtnText}>Insert Dice</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {isAnimating ? (
        <ActivityIndicator style={{ marginTop: 8 }} color="#000" />
      ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: 16,
  },
  card: {
    width: 720,
    height: 900,
    maxWidth: '100%',
    maxHeight: '100%',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#000' },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 20, color: '#000', fontWeight: '600' },
  input: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingRight: 44,
    paddingVertical: 12,
    fontSize: 18,
    color: '#000',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  rollBtn: {
    backgroundColor: '#000',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  rollBtnDisabled: { backgroundColor: '#555' },
  rollBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  errorText: {
    color: '#000',
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
    borderRadius: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  toggleLabel: { fontSize: 16, color: '#000', fontWeight: '600' },
  toggle: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  toggleOn: { backgroundColor: '#000' },
  toggleText: { fontSize: 14, fontWeight: '700', color: '#000' },
  toggleTextOn: { color: '#fff' },
  divider: { height: 2, backgroundColor: '#000', marginVertical: 16 },
  diceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 16,
  },
  totalValue: { fontSize: 28, fontWeight: '800' },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  clearBtn: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 12,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  clearBtnText: { fontSize: 16, color: '#555', fontWeight: '600' },
});
