import React, {useContext, useState} from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    SafeAreaView,
    ImageBackground,
    Dimensions, ActivityIndicator, Keyboard, TouchableWithoutFeedback, ScrollView
} from 'react-native';
import {Text, Input, Button, Overlay} from "react-native-elements";
import ProgressCircle from 'react-native-progress-circle'
import {EvilIcons, Ionicons, MaterialIcons} from '@expo/vector-icons';
import {NavigationEvents} from "react-navigation";
import {Context as UserContext} from "../context/UserContext";
import socket from "../api/socket";
import StepIndicator from 'react-native-step-indicator';
import FlashMessage, {showMessage} from "react-native-flash-message";
import ExitDialog from "../components/ExitDialog";
import {logger} from "../service/logger";

const {height, width} = Dimensions.get('window');

// componentDidUpdate(prevProps, prevState, snapshot) {
//     if(this.state.answer?.length > prevState.answer?.length){
//         this.setState({inputWidth: this.state.inputWidth + 5})
//     }else if(this.state.answer?.length < prevState.answer?.length){
//         this.setState({inputWidth: this.state.inputWidth - 5})
//     }
//     if(!this.state.answer?.length && prevState.answer?.length) this.setState({inputWidth: this.state.minWidth})
// }

const GameScreen = ({navigation}) => {
    const colors = ['#752DFE', '#FF5050', '#03CDFB', '#73D817', '#EE59C5', '#F5CD2E', '#00D9C8'];
    const {state, getQuestion, getAllQuestions, postAnswer} = useContext(UserContext);
    let gameId = navigation.state.params.gameId;
    const [visible, setVisible] = useState(false);
    const [inputFocus, setInputFocus] = useState(false);
    const [loadingComponent, setLoadingComponent] = useState(false);
    const [answer, setAnswer] = useState(null);
    // const [maximumStep, setMaximumStep] = useState(state.maxStep+1 || state?.question?.step);
    const minWidth = 200;
    const [inputWidth, setInputWidth] = useState(minWidth);
    const attr = [
        answer?.length && answer.replace(/\s\s+/g, ' ').trim().split('').pop() !== 'ը'
            ? ['ա', 'է', 'ի', 'օ', 'ւ', 'ո', 'ե'].includes(answer.replace(/\s\s+/g, ' ').trim().split('').pop())
            ? 'ն'
            : 'ը'
            : '',
        answer?.length ? ' հետ' : '',
        '',
        '',
        answer?.length ? ' էին (անում)' : '',
        answer?.length && answer.replace(/\s\s+/g, ' ').trim().split('').pop() !== 'ը'
            ? ['ա', 'է', 'ի', 'օ', 'ւ', 'ո', 'ե'].includes(answer.replace(/\s\s+/g, ' ').trim().split('').pop())
            ? 'ն'
            : 'ը'
            : '',
        ''
    ];
    const toggleOverlay = () => {
        setVisible(!visible);
    };
    const setCurrentAnswer = (value) => {
        setAnswer(value);
    };
    const sendAnswer = async () => {
        Keyboard.dismiss()
        if (answer) {
            let finalAnswer = answer.replace(/\s\s+/g, ' ').trim();
            await postAnswer({answer: finalAnswer, gameId, step: state?.question?.step})
            logger(`SENT joinUsers - ${JSON.stringify({gameId, userId: state?.user._id})}`)
            await socket.emit("joinUsers", {gameId, userId: state?.user._id});
            // console.log(state.answer)
            setAnswer(null)
        } else if (state.answer) {
            await postAnswer({answer: state.answer, gameId, step: state?.question?.step})
            logger(`SENT joinUsers - ${JSON.stringify({gameId, userId: state?.user._id})}`)
            await socket.emit("joinUsers", {gameId, userId: state?.user._id});
        } else {
            showMessage({
                hideStatusBar: true,
                duration: 2000,
                // backgroundColor: 'red',
                titleStyle: {
                    fontSize: 16,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                },
                message: "Խնդրում ենք, Պատասխանել հարցին",
                type: "danger",
                // floating: true
            });
        }
    }


    return (
        <View style={{flex: 1}}>
            <ScrollView contentContainerStyle={{flexGrow: 1}}
                        keyboardShouldPersistTaps='handled' scrollEnabled={false}
            >
                <ImageBackground source={require('../assets/question.png')} imageStyle={{height: height * 0.45}}
                                 style={{flex: 1}} resizeMode='stretch'>
                    <SafeAreaView style={{height}}>
                        <NavigationEvents onWillFocus={async () => {
                            await getQuestion({gameId});
                            await getAllQuestions();
                            setLoadingComponent(true)
                        }}/>
                        {state.loading && !loadingComponent
                            ? <View style={{flex: 1, justifyContent: 'center'}}>
                                <ActivityIndicator size="large" color="#39c9bb"/>
                            </View>
                            : <View>
                                <ExitDialog navigation={navigation} toggleOverlay={toggleOverlay} visible={visible}/>

                                <View style={{
                                    justifyContent: 'center',
                                    paddingHorizontal: 25,
                                    marginTop: Platform.OS === 'android' ? height * 0.04 : height * 0.01
                                }}>
                                    <StepIndicator
                                        customStyles={{
                                            stepIndicatorSize: 25,
                                            currentStepIndicatorSize: 30,
                                            separatorStrokeWidth: 2,
                                            currentStepStrokeWidth: 3,
                                            stepStrokeCurrentColor: colors[state?.question?.step - 1],
                                            stepStrokeWidth: 3,
                                            stepStrokeFinishedColor: colors[state?.question?.step - 1],
                                            stepStrokeUnFinishedColor: '#aaaaaa',
                                            separatorFinishedColor: colors[state?.question?.step - 1],
                                            separatorUnFinishedColor: '#aaaaaa',
                                            stepIndicatorFinishedColor: colors[state?.question?.step - 1],
                                            stepIndicatorUnFinishedColor: '#ffffff',
                                            stepIndicatorCurrentColor: '#ffffff',
                                            stepIndicatorLabelFontSize: 13,
                                            currentStepIndicatorLabelFontSize: 13,
                                            stepIndicatorLabelCurrentColor: colors[state?.question?.step - 1],
                                            stepIndicatorLabelFinishedColor: '#ffffff',
                                            stepIndicatorLabelUnFinishedColor: '#aaaaaa',
                                            labelColor: '#999999',
                                            labelSize: 13,
                                            currentStepLabelColor: colors[state?.question?.step - 1]
                                        }}
                                        onPress={async (position) => {
                                            Keyboard.dismiss()
                                            if (state?.maxStep + 1 > position) {
                                                setAnswer(null)
                                                await getQuestion({gameId, currentStep: position + 1});
                                                // console.log(state.questions[position])
                                            }
                                        }}
                                        stepCount={state.maxStep ? state.maxStep + 1 : 1}
                                        currentPosition={state?.question?.step - 1}
                                    />
                                </View>
                                <View style={styles.container}>

                                    {state.question && state.questions &&
                                    <View style={{justifyContent: 'center', marginTop: height * 0.03}}>
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            paddingHorizontal: 30
                                        }}>
                                            <TouchableOpacity
                                                style={styles.navButton}
                                                onPress={toggleOverlay}
                                            >
                                                <EvilIcons name="close" size={24} color="white"
                                                           stule={{fontWeight: 'bold'}}/>
                                                <Text style={styles.navButtonText}>ԵԼՔ</Text>
                                            </TouchableOpacity>
                                            <ProgressCircle
                                                percent={(state?.question?.step * 100) / 7}
                                                radius={height * 0.04}
                                                color={colors[state?.question?.step - 1]}
                                                borderWidth={3}
                                                shadowColor="white"
                                                bgColor={'#00BCD3'}
                                            >
                                                <Text style={{fontSize: 18}}>{state.question.step + '/' + 7}</Text>
                                            </ProgressCircle>
                                            <TouchableOpacity
                                                style={styles.navButton}
                                                onPress={sendAnswer}
                                            >
                                                {state?.question?.step === 7 ?
                                                    <View style={{alignItems: 'center'}}>
                                                        <MaterialIcons name="done" size={24} color="white"
                                                                       stule={{fontWeight: 'bold'}}/>
                                                        <Text style={styles.navButtonText}>ԱՎԱՐՏ</Text>
                                                    </View>
                                                    : <View style={{alignItems: 'center'}}>
                                                        <Ionicons name="ios-arrow-forward" size={24} color="white"
                                                                  stule={{fontWeight: 'bold'}}/>
                                                        <Text style={styles.navButtonText}>ՀԱՋՈՐԴ</Text>
                                                    </View>
                                                }

                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.card}>
                                            {state.loading
                                                ? <View style={{justifyContent: 'center', zIndex: 100,}}>
                                                    <ActivityIndicator size="large" color="#39c9bb"/>
                                                </View>
                                                : <Text style={{
                                                    fontSize: 28,
                                                    color: colors[state.question.step - 1]
                                                }}>{state.question.question}</Text>
                                            }
                                        </View>
                                    </View>}
                                </View>
                                <View style={{alignItems: 'center'}}>
                                    <Input inputContainerStyle={{borderBottomWidth: 0}}
                                           containerStyle={
                                               [styles.inputContainer, {
                                                   width: width * 0.9,
                                                   marginVertical: height * 0.02
                                               }]
                                           }
                                           inputStyle={styles.input}
                                           onTouchStart={() => {
                                               setAnswer(answer === null ? state.answer : answer)
                                               setInputFocus(true)
                                           }}
                                           autoFocus={inputFocus}
                                           onBlur={() => setInputFocus(false)}
                                        //    placeholderTextColor={state.answer? colors[state?.question?.step-1]: 'grey'}
                                           placeholder={state.answer || "Քո Պատասխանը"}
                                           value={answer === null ? state.answer : answer}
                                           onChangeText={(value) => setCurrentAnswer(value)}
                                           autoCapitalize="none"
                                           returnKeyType="done"
                                           onSubmitEditing={sendAnswer}
                                           autoCorrect={false}
                                           rightIcon={<Text style={{
                                               fontSize: 18,
                                               paddingBottom: height * 0.01,
                                               color: '#00D9C8'
                                           }}>{attr[state?.question?.step - 1] && '- ' + attr[state?.question?.step - 1]}</Text>}
                                    />
                                    <Text style={{
                                        justifyContent: 'center',
                                        color: '#8d00c9',
                                        marginVertical: height * 0.01
                                    }}>ԱՅԼ ՏԱՐԲԵՐԱԿՆԵՐ</Text>
                                    <ScrollView
                                        contentContainerStyle={{flexDirection: 'column', justifyContent: 'center'}}>
                                        {state.randomAnswers && state.randomAnswers.map((item, index) => <Button
                                                key={item + index}
                                                containerStyle={{marginVertical: height * 0.02}}
                                                buttonStyle={[styles.inputContainer, {
                                                    width: width * 0.9,
                                                    borderRadius: 25,
                                                    height: 60,
                                                    borderColor: '#00D9C8',
                                                    borderWidth: 3,
                                                    borderBottomWidth: 3
                                                }]}
                                                titleStyle={{color: '#00D9C8'}}
                                                title={item}
                                                onPress={() => setAnswer(item)}
                                            />
                                        )}
                                    </ScrollView>
                                </View>
                            </View>
                        }

                        <FlashMessage position="top"/>
                    </SafeAreaView>
                </ImageBackground>
            </ScrollView>
        </View>
    )
};

GameScreen.navigationOptions = () => {
    return {
        header: null
    };
};

const styles = StyleSheet.create({
    card: {
        justifyContent: 'center',
        backgroundColor: '#f9f9f9',
        alignItems: 'center',
        alignSelf: 'center',
        width: '85%',
        height: height * 0.17,
        marginTop: height * 0.02,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#d1d1d1',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,

        elevation: 15,
    },
    inputContainer: {
        backgroundColor: '#eeeeee',
        borderRadius: 50,
        // marginTop: 30,
        paddingVertical: 5,
        paddingHorizontal: 10,
        height: 55,
        // marginLeft: width* 0.09,
        // width: width* 0.8,
        borderBottomWidth: 0
    },
    navButton: {
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#007f92',
        width: 60,
        height: 60,
        borderRadius: 10
    },
    navButtonText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold'
    },
    container: {
        justifyContent: 'center',
        marginBottom: height * 0.05
    },
    input: {
        fontSize: 18,
        color: '#00D9C8',
        paddingBottom: height * 0.01,
        paddingLeft: width * 0.04
    },
    button: {
        alignSelf: 'center',
        borderRadius: 50,
        width: '80%',
        height: height * 0.07,
        backgroundColor: '#39c9bb'
    },
});

export default GameScreen;
