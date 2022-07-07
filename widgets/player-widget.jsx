import React from 'react';
import {Languages} from "locales";
import { FaMicrophone } from 'react-icons/fa'

const styles = {
  micBtn: {
    borderRadius: "50%",
    padding: "10px",
    cursor: "pointer",
    fontSize: "1.6em",
  }
};

// Receives many things in the props... Basically it's just the UI.
//
export class MicWidget extends React.Component {

  constructor(props) {
    super(props);

    this.blockId = props.blockId || "-1";
    this.onStart = props.onStart || console.log;
    this.onStop = props.onStop || console.log;
    this.isSelectionDisabled = props.isSelectionDisabled;  // If set, language selection is disabled.
    this.setDictationLanguage = props.setDictationLanguage || console.log;
    this.registerToAppState = props.registerToAppState || console.log;

    let propsLang = props.lang || "en";
    let langCode;
    if (propsLang.includes("-") || propsLang.includes("_")) {
        langCode = propsLang;
    } else {
        langCode = Languages.getDefaultLocaleForLanguage(propsLang)[1];
    }

    if (!langCode) {
        langCode = "en-US";
    }

    this.state = {
        isListening: false,
        lang: langCode,
    };
  }

  handleDictationLangChange = (ev) => {
      this.setState({
          lang: ev.target.value
      });
      this.setDictationLanguage(ev.target.value);
  }

  toggleMic = () => {
      if (this.state.isListening) {
          this.onStop(this.blockId);
      } else {
          this.onStart(this.blockId, this.state.lang);
      }
  }

  componentDidMount() {
      this.registerToAppState((newAppState) => {
          debugger;
          if (newAppState.temp.isListening && newAppState.temp.activeBlock==this.blockId) {
              this.setState({isListening: true});
          } else {
              this.setState({isListening: false});
          }

          if (!this.isSelectionDisabled) {
              if (newAppState.prefs.dictationLangCode) {
                  let newLang = newAppState.prefs.dictationLangCode;
                  if (newLang.includes("-") || newLang.includes("_")) {
                      newLang = newLang;
                  } else {
                      newLang = Languages.getDefaultLocaleForLanguage(newLang)[1];
                  }

                  if (!newLang) {
                      newLang = "en-US";
                  }
                  this.setState({lang: newLang});
              }
          }
      });
  }

  componentWillUnmount() {
      if (this.state.isListening) {
          this.toggleMic();
      }
  }

  render = () => {
    return (
        <div>
            {this.isSelectionDisabled ?
                <span>{Languages.codeToName(this.state.lang).split(" (")[0]}</span> :
                <select
                    value={this.state.lang}
                    onChange={this.handleDictationLangChange} >

                    <option key={0} value={"en-US"}>English</option>
                    {Languages.getSupportedLanguagesOnlyList().map((language, index) =>
                        <option key={index + 1} value={Languages.getDefaultLocaleForLanguage(language[1])[1]}>{language[0]}</option>
                    )}
                </select>
            }
          &nbsp;&nbsp;
            {this.props.isDictationEnabled && <span id="mic" onClick={this.toggleMic} style={styles.micBtn} >
            {this.state.isListening ? <FaMicrophone style={{color: "red"}}/> : <FaMicrophone style={{color: "#77a"}}/>}
          </span>}

        </div>
    );
  }
}

