import React from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MapComponent from "../components/Map.component";
import {getOrderStatus} from "../utills/orderUtill";
import {orderStateConstants} from "../constants";
import * as Location from "expo-location";
import {getTranslation} from "../utills/translate";
import {MaterialCommunityIcons, Ionicons} from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from "expo-background-fetch"
import {orderService} from "../services/order.service";


const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = 0.01;

const LOCATION_TASK_NAME = 'background-location-task';


class MapScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            orderId: this.props.orderId,
            onlyView: this.props.onlyView,
            orderInfo: {},
            shouldPullLocation: true,
            location: {
                longitude: null,
                latitude: null
            },
            loadingState: true
        }
    }

    RegisterBackgroundTask = async () => {
        try {
            await BackgroundFetch.registerTaskAsync(LOCATION_TASK_NAME, {
                minimumInterval: 5, // seconds,
            })
            console.log("Task registered")
        } catch (err) {
            console.log("Task Register failed:", err)
        }
    }


    getCurrentPosition = async (callback) => {
        await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Lowest
        })
            .then((location) => {
                const region = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: LATITUDE_DELTA,
                    longitudeDelta: LONGITUDE_DELTA,
                };
                this.setState({
                    location: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    }
                }, callback);
            });
    };

    componentDidMount() {
        this.props.getOrderInfo(this.props.orderId).then(() => {
            this.setState({loadingState: false})
        });
        Location.requestPermissionsAsync().then(async (data) => {
            if (data.status === "granted") {
                await this.getCurrentPosition(() => {
                    this.props.onlyView === false && this.pullOrderInfo();
                })
                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                    accuracy: Location.Accuracy.BestForNavigation,
                });
                await this.RegisterBackgroundTask();
            }
        });

    }

    pullOrderInfo() {
        this.props.updatePosition(this.state.location);
        this.props.getOrderInfo(this.props.orderId);
        this.requestOrdersList = setInterval(async () => {
            await this.getCurrentPosition(() => {
                this.props.updatePosition(this.state.location).then(() => console.log('update position'));
                this.props.getOrderInfo(this.props.orderId);
            });
        }, 5000)
    }

    componentWillUnmount() {
        clearInterval(this.requestOrdersList);
    }

    splitInToChunks = (locations) => {
        let i, temparray = [], chunk = 25;
        for (i = 0; i < locations.length; i += chunk - 1) {
            temparray.push(locations.slice(i, i + chunk));
        }
        return temparray
    };

    getMapProps = (status) => {

        const {orderInfo} = this.props;
        switch (status) {
            case orderStateConstants.COMPLETE :
                if (!orderInfo.locations || !orderInfo.locations.length) {
                    return {
                        onlyView: this.state.onlyView,
                        status: status,
                    }
                }
                return {
                    startLocation: orderInfo?.locations[0],
                    destLocation: {
                        lat: +orderInfo?.locations[orderInfo?.locations.length - 1].lat,
                        lng: +orderInfo?.locations[orderInfo?.locations.length - 1].lng
                    },
                    status: status,
                    onlyView: this.state.onlyView,
                    showUser: orderInfo?.locations[0],
                    showDest: {
                        lat: +orderInfo?.locations[orderInfo?.locations.length - 1].lat,
                        lng: +orderInfo?.locations[orderInfo?.locations.length - 1].lng
                    },
                    locations: this.splitInToChunks(orderInfo?.locations)
                    // locations: orderInfo?.locations
                };
            case orderStateConstants.ORDERED :
                let orderedProps = {
                    startLocation: {
                        lat: orderInfo?.address.latitude,
                        lng: orderInfo?.address.longitude,
                        address: orderInfo?.address.address1
                    },
                    status: status,
                    showUser: {
                        lat: orderInfo?.address.latitude,
                        lng: orderInfo?.address.longitude,
                        address: orderInfo?.address.address1
                    },
                    locations: [[]]
                };
                if (orderInfo?.destination_address?.latitude && orderInfo?.destination_address?.longitude) {
                    orderedProps = {
                        ...orderedProps, destLocation: {
                            lat: orderInfo?.destination_address?.latitude,
                            lng: orderInfo?.destination_address?.longitude,
                            address: orderInfo?.destination_address?.address1
                        }, showDest: {
                            lat: orderInfo?.destination_address?.latitude,
                            lng: orderInfo?.destination_address?.longitude,
                            address: orderInfo?.destination_address?.address1
                        }
                    }
                }
                return orderedProps;
            case orderStateConstants.ATTACHED_BY_AGENT:
            case orderStateConstants.AGENT_WAITING :
                let props = {
                    startLocation: {
                        lat: orderInfo?.agent?.location?.latitude,
                        lng: orderInfo?.agent?.location?.longitude,
                    },
                    showAgent: {
                        lat: orderInfo?.agent?.location?.latitude,
                        lng: orderInfo?.agent?.location?.longitude,
                    },
                    destLocation: {
                        lat: orderInfo?.address?.latitude,
                        lng: orderInfo?.address?.longitude,
                    },
                    showUser: {
                        lat: orderInfo?.address?.latitude,
                        lng: orderInfo?.address?.longitude,
                    },
                    locations: [[]],
                    status: status,
                };
                if (orderInfo?.destination_address?.latitude && orderInfo?.destination_address?.longitude) {
                    {
                        props = {
                            ...props, showDest: {
                                lat: orderInfo?.destination_address?.latitude,
                                lng: orderInfo?.destination_address?.longitude,
                                address: orderInfo?.destination_address?.address1
                            }
                        }
                    }
                }
                return props;
            case orderStateConstants.WORKING :
                let workingProps = {
                    showAgent: {
                        lat: orderInfo?.agent.location.latitude,
                        lng: orderInfo?.agent.location.longitude,
                    },
                    locations: [[]],
                    status: status,
                };
                if (orderInfo?.destination_address?.latitude && orderInfo?.destination_address?.longitude) {
                    workingProps = {
                        ...workingProps,
                        destLocation: {
                            lat: orderInfo?.destination_address?.latitude,
                            lng: orderInfo?.destination_address?.longitude,
                            address: orderInfo?.destination_address?.address1
                        },
                        showDest: {
                            lat: orderInfo?.destination_address?.latitude,
                            lng: orderInfo?.destination_address?.longitude,
                            address: orderInfo?.destination_address?.address1
                        },
                        startLocation: {
                            lat: orderInfo?.agent.location.latitude,
                            lng: orderInfo?.agent.location.longitude,
                        },
                    }
                } else {
                    workingProps = {
                        ...workingProps,
                        startLocation: {
                            lat: orderInfo?.address.latitude,
                            lng: orderInfo?.address.longitude,
                        }
                    }
                }
                return workingProps;
            case orderStateConstants.CANCELED :
                this.props.navigation.goBack();
                return;
            default : {
            }

        }
    };

    renderOrderButton = (status) => {
        switch (status) {
            case orderStateConstants.ORDERED :
                return {
                    text: getTranslation('accept'),
                };
            case orderStateConstants.ATTACHED_BY_AGENT :
                return {
                    text: getTranslation('i_am_waiting'),
                };
            case orderStateConstants.AGENT_WAITING :
                return {
                    text: getTranslation('start'),
                };
            case orderStateConstants.WORKING :
                return {
                    text: getTranslation('finish'),
                };
            default :
                return {
                    text: getTranslation('loading') + '...'
                };
        }
    };

    handleOrderButtonPress = (status, orderId) => {
        switch (status) {
            case orderStateConstants.ORDERED :
                return this.props.acceptOrder(orderId);
            case orderStateConstants.ATTACHED_BY_AGENT :
                return this.props.waitingOrder(orderId);
            case orderStateConstants.AGENT_WAITING :
                return this.props.startOrder(orderId);
            case orderStateConstants.WORKING :
                return this.props.finishOrder(orderId);
            default :
                return null;
        }
    };

    renderInfo = (status) => {

        const {orderInfo} = this.props;

        const address = orderInfo?.address?.address1?.split(',');
        const destination_address = orderInfo?.destination_address?.address1?.split(',');

        switch (status) {
            case orderStateConstants.ORDERED :
                return <View>
                    {address &&
                    <View style={styles.renderInfoStyle}>
                        <MaterialCommunityIcons name="source-commit-start" size={24} color="black"/>
                        <Text>{getTranslation('address')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{address[0]}</Text>
                    </View>
                    }
                    {destination_address &&
                    <View style={styles.renderInfoStyle}>
                        <MaterialCommunityIcons name="source-commit-end" size={24} color="black"/>
                        <Text>{getTranslation('destination')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{destination_address[0]}</Text>
                    </View>
                    }
                    <View style={{flexDirection: 'row', marginLeft: 5}}>
                        <Ionicons name="ios-pricetag" size={16} color="black" style={{paddingRight: 5}}/>
                        <Text>{getTranslation('estimated_price')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>
                            {orderInfo?.estimated_data?.price + ' ' +
                            (orderInfo?.services?.length ? orderInfo?.services[0]?.service?.currency?.symbol : '$')}
                        </Text>
                    </View>
                </View>;
            case orderStateConstants.ATTACHED_BY_AGENT :
                return <View>
                    {address &&
                    <View style={styles.renderInfoStyle}>
                        <MaterialCommunityIcons name="source-commit-start" size={24} color="black"/>
                        <Text>{getTranslation('address')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{address[0]}</Text>
                    </View>
                    }
                    {destination_address &&
                    <View style={styles.renderInfoStyle}>
                        <MaterialCommunityIcons name="source-commit-end" size={24} color="black"/>
                        <Text>{getTranslation('destination')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{destination_address[0]}</Text>
                    </View>
                    }
                    <View style={[styles.renderInfoStyle, {marginBottom: 10, marginLeft: 5}]}>
                        <Ionicons name="ios-phone-portrait" size={16} color="black" style={{paddingRight: 5}}/>
                        <Text>{getTranslation('phone')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{orderInfo?.customer?.address?.phone}</Text>
                    </View>
                    <View style={{flexDirection: 'row', marginLeft: 5}}>
                        <Ionicons name="ios-pricetag" size={16} color="black" style={{paddingRight: 5}}/>
                        <Text>{getTranslation('estimated_price')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>
                            {orderInfo?.estimated_data?.price + ' ' +
                            (orderInfo?.services?.length ? orderInfo?.services[0]?.service?.currency?.symbol : '$')}
                        </Text>
                    </View>
                </View>;
            case orderStateConstants.AGENT_WAITING :
                return <View>
                    {address &&
                    <View style={styles.renderInfoStyle}>
                        <MaterialCommunityIcons name="source-commit-start" size={24} color="black"/>
                        <Text>{getTranslation('address')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{address[0]}</Text>
                    </View>
                    }
                    {destination_address &&
                    <View style={styles.renderInfoStyle}>
                        <MaterialCommunityIcons name="source-commit-end" size={24} color="black"/>
                        <Text>{getTranslation('destination')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{destination_address[0]}</Text>
                    </View>
                    }
                    <View style={[styles.renderInfoStyle, {marginBottom: 10, marginLeft: 5}]}>
                        <Ionicons name="ios-phone-portrait" size={16} color="black" style={{paddingRight: 5}}/>
                        <Text>{getTranslation('phone')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{orderInfo?.customer?.address?.phone}</Text>
                    </View>
                    <View style={{flexDirection: 'row', marginLeft: 5}}>
                        <Ionicons name="ios-pricetag" size={16} color="black" style={{paddingRight: 5}}/>
                        <Text>{getTranslation('estimated_price')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>
                            {orderInfo?.estimated_data?.price + ' ' +
                            (orderInfo?.services?.length ? orderInfo?.services[0]?.service?.currency?.symbol : '$')}
                        </Text>
                    </View>
                </View>;
            case orderStateConstants.WORKING :
                return <View>
                    {address &&
                    <View style={styles.renderInfoStyle}>
                        <MaterialCommunityIcons name="source-commit-start" size={24} color="black"/>
                        <Text>{getTranslation('address')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{address[0]}</Text>
                    </View>
                    }
                    {destination_address &&
                    <View style={styles.renderInfoStyle}>
                        <MaterialCommunityIcons name="source-commit-end" size={24} color="black"/>
                        <Text>{getTranslation('destination')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{destination_address[0]}</Text>
                    </View>
                    }
                    <View style={[styles.renderInfoStyle, {marginBottom: 10, marginLeft: 5}]}>
                        <Ionicons name="ios-phone-portrait" size={16} color="black" style={{paddingRight: 5}}/>
                        <Text>{getTranslation('phone')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{orderInfo?.customer?.address?.phone}</Text>
                    </View>
                    <View style={{flexDirection: 'row', marginLeft: 5}}>
                        <Ionicons name="ios-pricetag" size={16} color="black" style={{paddingRight: 5}}/>
                        <Text>{getTranslation('initial_price')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>
                            {orderInfo?.initial_price + ' ' +
                            (orderInfo?.services?.length ? orderInfo?.services[0]?.service?.currency?.symbol : '$')}
                        </Text>
                    </View>
                </View>;
            case orderStateConstants.COMPLETE :
                return <View>
                    {address &&
                    <View style={styles.renderInfoStyle}>
                        <MaterialCommunityIcons name="source-commit-start" size={24} color="black"/>
                        <Text>{getTranslation('address')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{address[0]}</Text>
                    </View>
                    }
                    {destination_address &&
                    <View style={styles.renderInfoStyle}>
                        <MaterialCommunityIcons name="source-commit-end" size={24} color="black"/>
                        <Text>{getTranslation('destination')}: </Text>
                        <Text style={{fontWeight: 'bold'}}>{destination_address[0]}</Text>
                    </View>
                    }
                    <View style={{flexDirection: 'row', marginLeft: 5, alignItems: 'center'}}>
                        <Ionicons name="ios-pricetag" size={16} color="black" style={{paddingRight: 5}}/>
                        <Text>{getTranslation('final_price')}: </Text>
                        <Text style={{fontWeight: 'bold', fontSize: 24}}>
                            {orderInfo?.initial_price + ' ' +
                            (orderInfo?.services?.length ? orderInfo?.services[0]?.service?.currency?.symbol : '$')}
                        </Text>
                    </View>
                </View>;
            default :
                return null;
        }
    };

    renderPassiveButton = (status) => {
        switch (status) {
            case orderStateConstants.ORDERED :
                return {
                    text: getTranslation('back'),
                };
            case orderStateConstants.ATTACHED_BY_AGENT :
            case orderStateConstants.AGENT_WAITING :
            case orderStateConstants.WORKING :
                return {
                    text: getTranslation('open_navigator'),
                };
            default :
                return {
                    text: getTranslation('back')
                };
        }
    };

    handlePassiveButtonPress = (status) => {
        const {orderInfo} = this.props;
        switch (status) {
            case orderStateConstants.ORDERED :
            case orderStateConstants.COMPLETE :
                return this.props.navigation.goBack();
            case orderStateConstants.ATTACHED_BY_AGENT :
            case orderStateConstants.AGENT_WAITING :
                return this._handlePressDirections(orderInfo?.address?.address1);
            case orderStateConstants.WORKING :
                return this._handlePressDirections(orderInfo?.destination_address?.address1);
            default :
                return null;
        }
    };


    _handlePressDirections = (address) => {

        let daddr = encodeURIComponent(`${address}`);

        if (Platform.OS === 'ios') {
            Linking.openURL(`http://maps.apple.com/?daddr=${daddr}`);
        } else {
            Linking.openURL(`http://maps.google.com/?daddr=${daddr}`);
        }
    };

    render() {

        const {orderInfo, loading} = this.props;
        const {loadingState} = this.state;

        const endCases = [
            orderStateConstants.COMPLETE
        ];
        const orderStatus = getOrderStatus(orderInfo);

        if (loadingState) {
            return <View style={[styles.container, {justifyContent: 'center'}]}><ActivityIndicator size="large"
                                                                                                   color="black"/></View>
        }
        return (
            <View style={styles.container}>
                {
                    orderInfo &&
                    <View>
                        <View style={{flex: 4}}>
                            <MapComponent
                                {...this.getMapProps(orderStatus)}
                                showAgent={{
                                    lat: this.state?.location?.latitude,
                                    lng: this.state?.location?.longitude,
                                }}
                                getCurrentPosition={this.getCurrentPosition}
                            />
                        </View>
                        <View style={{flex: 1, paddingHorizontal: 15}}>
                            {this.renderInfo(orderStatus)}
                        </View>
                        <View style={styles.buttonWrapper}>
                            {
                                this.renderOrderButton() && !endCases.includes(orderStatus) &&
                                <TouchableOpacity style={styles.button} disabled={loading}
                                                  onPress={() => this.handleOrderButtonPress(orderStatus, orderInfo.id)}>
                                    <Text style={styles.buttonTextStyle}>
                                        {loading
                                            ? <ActivityIndicator size="large" color="black"/>
                                            : this.renderOrderButton(orderStatus).text || getTranslation('loading') + '...'
                                        }
                                    </Text>
                                </TouchableOpacity>
                            }
                            {
                                this.renderPassiveButton() &&
                                <TouchableOpacity style={[styles.button, styles.passiveButton]} disabled={loading}
                                                  onPress={() => this.handlePassiveButtonPress(orderStatus)}>
                                    <Text style={styles.passiveButtonTextStyle}>
                                        {loading
                                            ? <ActivityIndicator size="large" color="black"/>
                                            : this.renderPassiveButton(orderStatus).text || getTranslation('back')
                                        }
                                    </Text>
                                </TouchableOpacity>
                            }
                        </View>

                    </View>

                }

            </View>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    text: {
        fontSize: 24,
        color: 'black'
    },
    renderInfoStyle: {
        flexDirection: 'row',
        marginBottom: 5
    },
    buttonWrapper: {
        flex: 1,
        marginBottom: 80,
        paddingHorizontal: 10
    },
    button: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        borderRadius: 20,
        marginTop: 10,
        height: 60,
    },
    buttonTextStyle: {
        color: 'white'
    },
    passiveButton: {
        borderColor: 'black',
        backgroundColor: 'white',
        borderWidth: 1
    },
    passiveButtonTextStyle: {
        color: 'black',
        fontWeight: 'bold'
    },
});

export default MapScreen;

TaskManager.defineTask(LOCATION_TASK_NAME, ({data, error}) => {
    if (error) {
        console.log('error', error)
        return;
    }
    if (data) {
        const {locations} = data;
        console.log(locations)
        const receivedNewData = orderService.updatePosition(locations).then(() => console.log('update position'));
        return receivedNewData
            ? BackgroundFetch.Result.NewData
            : BackgroundFetch.Result.NoData
    }
});