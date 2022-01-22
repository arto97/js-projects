import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Platform,
    Keyboard,
    Dimensions,
    LayoutAnimation,
    ScrollView
} from 'react-native';
import moment from "moment";
import MyInput from "../components/MyInput";

const {height, width} = Dimensions.get('window');
import {Ionicons, FontAwesome, Foundation} from '@expo/vector-icons';
import MyButton from "../components/MyButton";
import {navigate} from "../_helpers/navigationRef";
import UserSelectModal from "../components/UserSelectModal";
import SelectInput from "../components/SelectInput";
import Loader from "../components/Loader";
import Toaster from "../_helpers/Toaster";

class EventCreateScreen extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            openDropDown: false,
            submitted: false,
            openUserSelectModal: false,
            focus: false,
            eventName: '',
            eventType: '',
            gameType: '',
            stadium: null,
            dateArray: [],
            timeArray: [],
            date: null,
            time: null,
            dateTime: null,
            selectedUsers: []
        };

    }

    sendPushNotification = async (expoPushToken) => {

        const message = {
            to: expoPushToken,
            sound: 'default',
            title: 'Gndak',
            body: 'You have been invited to the game',
            data: {data: 'goes here'},
        };

        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const stadium = this.props.navigation.state.params?.stadium || null;
        if ((stadium && (!this.state.stadium || stadium._id !== this.state.stadium._id) || (!stadium && prevProps.navigation.state.params?.stadium))) {
            if (stadium) {
                let startDate = new Date();
                if (moment(stadium.date.dateStart).diff(moment(startDate)) >= 0) startDate = stadium.date.dateStart;
                let start = moment(startDate),
                    end = stadium.date.dateEnd
                        ? moment(startDate).add(1, 'M').diff(moment(stadium.date.dateEnd)) >= 0
                            ? moment(stadium.date.dateEnd)
                            : moment(startDate).add(1, 'M')
                        : moment(startDate).add(1, 'M');

                const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat'];

                const result = [];

                for (let i = 0; i < stadium.date.day.length; i++) {
                    let current = start.clone();
                    while (current.day(7 + days.indexOf(stadium.date.day[i].name)).isBefore(end)) {
                        result.push({label: current.clone(), value: stadium.date.day[i]._id});
                    }
                }

                const sortedArray = result.sort((a, b) => a.label.diff(b.label))
                const array = sortedArray.map((el, i) => {
                    return {value: el.value + i, label: el.label.format('(ddd) MMM Do YYYY')}
                })
                this.setState({stadium: stadium, dateArray: array})
            } else {
                this.setState({stadium: stadium, dateArray: null});
            }
        }
        if (stadium && (!this.state.dateArray || (this.state.date && this.state.date !== prevState.date))) {
            const dayId = this.state.date.slice(0, -1)
            const timer = stadium.date.day.find((el) => el._id === dayId)
            const duration = moment.duration(moment(timer.timeEnd).diff(timer.timeStart));
            const hours = Math.round(duration.asHours());
            const result = [];
            let current = timer.timeStart;
            for (let i = 0; i < hours; i++) {
                const next = moment(current).add(1, 'hours')
                result.push({
                    label: `${moment(current).format('HH:mm')} - ${moment(next).format('HH:mm')}`,
                    value: `${moment(current)}`
                });
                current = next
            }
            this.setState({timeArray: result})
        }
        if (this.state.date && this.state.time && this.state.time !== prevState.time) {
            const dayId = this.state.date;
            const date = this.state.dateArray.find((el) => el.value === dayId)
            const time = new Date(+this.state.time)

            const arr = date.label.split(' ')
            arr[2] = arr[2].slice(0, -2)
            const stringDate = arr.join(' ')

            let
                day = moment(stringDate),
                timer = moment(time, 'HH:mm');

            day.set({
                hour: timer.get('hour'),
                minute: timer.get('minute')
            });

            this.props.checkDate(day)
            this.setState({dateTime: day})
        }
    }


    toggleHeader = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        this.setState({focus: !this.state.focus});
    };

    onSelect = (selectedUsers) => {
        const selectedUsersTokens = [];
        selectedUsers.map(el => {
            return users.find(user => {
                if (user && user._id.toString() === el.value.toString()) {
                    selectedUsersTokens.push(user.expoPushToken)
                }
            });
        })
        this.setState({selectedUsers: selectedUsersTokens})
        this.setState({openUserSelectModal: false})
    }


    render() {
        const {
            openUserSelectModal,
            eventName,
            selectedUsers,
            gameType,
            stadium,
            dateArray,
            timeArray,
            date,
            time,
            dateTime
        } = this.state;
        const {createEvent, users, getUsers, loading, error, message} = this.props;

        if (loading) {
            return <View style={styles.main}>
                <Loader/>
            </View>
        }
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS == "ios" ? "padding" : "height"}
                style={{flex: 1}}
                keyboardVerticalOffset={0}
            >
                <TouchableWithoutFeedback onPress={() => {
                    Keyboard.dismiss()
                    this.setState({show: false})
                }}>
                    <View style={[styles.main, {paddingTop: 50}]}
                          onStartShouldSetResponder={this.closeDropDownByClickingOutside}
                    >
                        {error &&
                        <Toaster message={error}/>
                        }
                        <UserSelectModal
                            toggleOverlay={() => this.setState({openUserSelectModal: false})}
                            getUsers={getUsers}
                            users={users}
                            visible={openUserSelectModal}
                            onPress={(selectedUsers) => this.onSelect(selectedUsers)}
                        />
                        <View style={styles.title}>
                            <Text style={{fontSize: 16, color: '#212D49'}}>Create Event</Text>
                        </View>
                        <ScrollView style={{paddingHorizontal: width * 0.1, marginVertical: height * 0.01}}
                                    scrollEnabled>
                            <MyInput placeholder="Event Name"
                                     value={eventName}
                                     style={{width: width * 0.79, alignSelf: 'center'}}
                                     focus={this.toggleHeader}
                                     blur={this.toggleHeader}
                                     onchange={(value) => this.setState({eventName: value})}
                            />
                            <View style={styles.line}/>
                            <TouchableWithoutFeedback onPress={() => {
                                navigate('LocationScreenContainer', {stadium})
                            }}>
                                <View style={[styles.input, {
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    padding: 10,
                                    alignItems: 'center'
                                }]}>
                                    <Text
                                        style={[{fontSize: 13}, !stadium?.name && {color: '#979FAF'}]}>{stadium?.name || "Location"}</Text>
                                    <FontAwesome name="location-arrow" size={16} color="black"
                                                 style={{transform: [{rotateY: '180deg'}]}}/>
                                </View>
                            </TouchableWithoutFeedback>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                <View style={[styles.input, {width: '45%', alignSelf: 'flex-start'}]}>
                                    <SelectInput
                                        placeholder={{
                                            label: 'Select Date',
                                            value: null,
                                            color: '#979FAF',
                                        }}
                                        items={dateArray}
                                        onValueChange={(val) => {
                                            this.setState({date: val, time: null, timeArray: null})
                                        }}
                                        selectedItem={date}
                                    />
                                </View>
                                <View style={[styles.input, {width: '45%'}]}>
                                    <SelectInput
                                        placeholder={{
                                            label: 'Select Time',
                                            value: null,
                                            color: '#979FAF',
                                        }}
                                        items={timeArray}
                                        onValueChange={(val) => {
                                            this.setState({time: val})
                                        }}
                                        selectedItem={time}
                                    />
                                </View>

                            </View>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                <View style={[styles.input, {
                                    width: '45%',
                                    justifyContent: 'center',
                                    paddingVertical: 0
                                }]}>
                                    <SelectInput
                                        placeholder={{
                                            label: 'Game Type',
                                            value: null,
                                            color: '#979FAF',
                                        }}
                                        items={[
                                            {label: "Football", value: 'football'},
                                            {label: "Basketball", value: 'basketball'}
                                        ]}
                                        onValueChange={(val) => this.setState({gameType: val})}
                                        selectedItem={gameType}
                                    />
                                </View>
                                <View style={[styles.input, {
                                    width: '45%',
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    padding: 10,
                                    alignItems: 'center'
                                }]}>
                                    <Text
                                        style={[{fontSize: 13}, !stadium?.price && {color: '#979FAF'}]}>{stadium?.price || "Price"}</Text>
                                    <Foundation name="dollar" size={24} color="black"/>
                                </View>
                            </View>
                            <TouchableWithoutFeedback onPress={() => this.setState({openUserSelectModal: true})}>
                                <View style={[styles.input,
                                    {
                                        width: 50,
                                        height: 50,
                                        borderRadius: 25,
                                        backgroundColor: 'white',
                                        marginTop: 20,
                                        alignSelf: 'center',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }]}>
                                    <Ionicons name="ios-add" size={30} color="#979FAF"/>
                                </View>
                            </TouchableWithoutFeedback>
                            <View style={{flexDirection: 'row', justifyContent: 'space-around', marginTop: 40}}>
                                <MyButton
                                    onPress={() => navigate('HomeScreen')}
                                    text="Cancel"
                                    style={[styles.button, {backgroundColor: 'transparent'}]}
                                    textStyle={{color: '#F94024'}}
                                />
                                <MyButton
                                    text="Save"
                                    disabled={error}
                                    style={[styles.button, {backgroundColor: '#F94024'}]}
                                    onPress={() => {
                                        createEvent({
                                            eventName,
                                            stadium: stadium?._id,
                                            dateTime,
                                            gameType,
                                            selectedUsers
                                        })
                                        this.setState({submitted: true})
                                    }}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        )
    }
};

const styles = StyleSheet.create({
    main: {
        flex: 1,
        backgroundColor: '#f4f6fa'
    },
    title: {
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    line: {
        backgroundColor: '#979FAF',
        marginTop: 30,
        marginBottom: 10,
        width: width * 0.85,
        height: 1,
        alignSelf: 'center',
        opacity: 0.3
    },
    button: {
        width: width * 0.3,
        height: 40,
        borderColor: '#F94024'
    },
    input: {
        width: width * 0.79,
        alignSelf: 'center',
        marginTop: 20,
        justifyContent: 'center',
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        height: height * 0.06,
        shadowColor: "#212D49",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,

        elevation: 2,
    }
});

export default EventCreateScreen;
