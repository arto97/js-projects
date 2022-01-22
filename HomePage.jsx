import React from 'react';
import {orderStateConstants} from '../_constants';
import {connect} from 'react-redux';
import about_us from '../assets/about_us.jpg';
import MapSection from '../_components/Map'
import {orderAction, userActions} from '../_actions';
import Header from "../_components/Header";
import LocationSearchInput from "../_components/LocationSearchInput";
import './home.css';
import "react-bootstrap-typeahead/css/Typeahead.css";
import 'react-credit-cards/es/styles-compiled.css';
import CreditCardInput from 'react-credit-card-input';

import {history} from "../_helpers";
import {IoIosAddCircleOutline} from 'react-icons/io';
import {AiFillCloseCircle} from 'react-icons/ai';
import {mapService} from "../_services/map.service";
import BeatLoader from "react-spinners/BeatLoader";
import {getTranslation} from "../utills/translate";

class HomePage extends React.Component {
    requestAgentLocation;

    constructor(props) {

        super(props);
        this.state = {
            width: window.innerWidth,
            height: 0,
            address: '',
            ordered: false,
            working: false,
            waiting: false,
            canceled: false,
            cash: true,
            openAddCard: false,
            expiry_focus: false,
            selectedCard: '',
            button: 'Request Now',
            locationFrom: '',
            message: '',
            locationTo: '',
            skills: [],
            submitted: false,
            cardInfo: {
                name: '',
                focus: '',
                cardNumber: '',
                expiry: '',
                expiry_month: '',
                expiry_year: '',
                cvc: ''
            },
            location: {
                marked: false
            },
            distance: 0,
            price: 0,
            destLocation: {
                marked: false
            },
            destAddress: '',
            agentLocation: {}
        }
        this.handleChange = this.handleChange.bind(this);
        this.handleInputFocus = this.handleInputFocus.bind(this);
        this.handleChangeCardInfo = this.handleChangeCardInfo.bind(this);
    }

    handleChange(e) {
        const {name, value} = e.target;
        this.setState({[name]: value});
    }

    handleChangeCardInfo = (e) => {
        const {name, value} = e.target;
        const {cardInfo} = this.state;

        this.setState({
            cardInfo: {
                ...cardInfo,
                [name]: value
            }
        });
    };

    handleChangeCardName = (e) => {
        let {value} = e.target;
        const {cardInfo} = this.state;
        const regExp = new RegExp('[a-zA-Z ]');
        if (regExp.test(value) || !value) {
            let err = false;
            if (!value.trim().includes(' ')) err = true;
            if (value.split(' ').length > 2) value = value.trimEnd();
            this.setState({
                cardInfo: {
                    ...cardInfo,
                    name: value,
                    nameError: err
                }
            });
        }
    };

    handleInputFocus = (e) => {
        this.setState({focus: e.target.name});
    };


    componentDidUpdate(prevProps, prevState, snapshot) {
        navigator.geolocation.getCurrentPosition((position) => {
            if ((prevState.location.lng !== position.coords.longitude || prevState.location.lat !== position.coords.latitude) && !this.state.location.marked && !this.state.address) {
                this.setState({
                    location: {
                        ...this.state.location,
                        lng: position.coords.longitude,
                        lat: position.coords.latitude
                    }
                });
                mapService.getAddressFromLatLng(position.coords.latitude, position.coords.longitude).then(
                    response => {
                        const address = response.results[0].formatted_address;
                        this.setState({address});
                    },
                    error => {
                        console.error(error);
                    }
                );
            }
        }, (e) => {
        }, {timeout: 10});
        if (this.props.order?.orderInfo && this.props.order?.orderInfo[0]?.agent &&
            (this.state.agentLocation.latitude !== +this.props.order?.orderInfo[0]?.agent?.location.latitude
                || this.state.agentLocation.longitude !== +this.props.order?.orderInfo[0]?.agent?.location.longitude)) {
            this.setState({
                agentLocation: {
                    ...this.state.agentLocation,
                    longitude: +this.props.order?.orderInfo[0]?.agent?.location.longitude,
                    latitude: +this.props.order?.orderInfo[0]?.agent?.location.latitude
                }
            })
        }
        const orderStatus = this.props.order?.orderInfo && this.props.order.orderInfo?.order_state ? this.props.order.orderInfo?.order_state.system_name :
            this.props.order?.orderInfo && this.props.order.orderInfo.length
                ? this.props.order.orderInfo[0]?.order_state.system_name
                : this.props.order?.orderInfo?.state?.system_name;

        const requestCases = [orderStateConstants.CANCELED, orderStateConstants.COMPLETE];
        if (this.state.destLocation && Object.keys(this.state.destLocation).length && requestCases.includes(orderStatus)) {
            this.setState({destLocation: null, destAddress: ''})
        }
        if (this.props.order?.orderEstimatedValue &&
            (this.props.order.orderEstimatedValue.distance !== this.state.distance ||
                this.props.order.orderEstimatedValue.price + this.props.order?.orderEstimatedValue?.currency?.symbol !== this.state.price)
        ) {
            this.setState({
                price: this.props.order.orderEstimatedValue.price + this.props.order?.orderEstimatedValue?.currency?.symbol,
                distance: this.props.order.orderEstimatedValue.distance
            })
        }
        if (this.props.order?.orderInfo && this.props.order?.orderInfo[0] && !prevState.location.marked) {
            this.setState({
                location: {
                    ...this.state.location,
                    marked: true,
                    lng: +this.props.order?.orderInfo[0]?.longitude,
                    lat: +this.props.order?.orderInfo[0]?.latitude
                },
                address: this.props.order?.orderInfo[0]?.address?.address1
            })
        }
        if (this.props.order?.orderInfo && this.props.order?.orderInfo[0]?.destination_address && !prevState.destLocation?.marked) {
            this.setState({
                destLocation: {
                    ...this.state.destLocation,
                    marked: true,
                    lng: +this.props.order?.orderInfo[0]?.destination_address?.longitude,
                    lat: +this.props.order?.orderInfo[0]?.destination_address?.latitude
                },
                destAddress: this.props.order?.orderInfo[0]?.destination_address?.address1,
                distance: this.props.order?.orderInfo[0]?.estimated_data.distance,
                price: this.props.order?.orderInfo[0]?.estimated_data.price + this.props.order?.orderInfo[0]?.services[0]?.service?.currency?.symbol,
            })
        }
        if (this.props.cards && this.props.cards.length && (!prevProps.cards || prevProps.cards.length !== this.props.cards.length)) {
            this.setState({
                selectedCard: this.props.cards[this.props.cards.length - 1].id,
                cardInfo: this.props.cards[this.props.cards.length - 1]
            });
        }
        if ((!prevProps.order || !Object.keys(prevProps.order).length)
            && this.props.order?.orderInfo?.length && this.props.order.orderInfo[0].payment?.length) {
            this.setState({cash: !this.props.order.orderInfo[0].payment[0].credit_card_id});
        }
    }

    renderButtonText = () => {
        const {order} = this.props;
        const cancelCases = [orderStateConstants.ORDERED, orderStateConstants.ATTACHED_BY_AGENT];
        const hidedCases = [orderStateConstants.WORKING, orderStateConstants.AGENT_WAITING];
        const requestCases = [orderStateConstants.CANCELED, orderStateConstants.COMPLETE];
        const orderStatus = order?.orderInfo && order.orderInfo?.order_state ? order.orderInfo?.order_state.system_name :
            order?.orderInfo && order.orderInfo.length
                ? order.orderInfo[0]?.order_state.system_name
                : order?.orderInfo?.state?.system_name;

        switch (true) {
            case this.props.order.loading:
                return null;
            case hidedCases.includes(orderStatus):
                return 'hide';
            case cancelCases.includes(orderStatus):
                return getTranslation("cancel");
            case requestCases.includes(orderStatus):
                return getTranslation("request_now");
            default :
                return getTranslation("request_now");
        }
    }

    renderMessageText = () => {
        const {order} = this.props;
        const orderStatus = order?.orderInfo && order.orderInfo?.order_state ? order.orderInfo?.order_state.system_name :
            order?.orderInfo && order.orderInfo.length
                ? order.orderInfo[0]?.order_state.system_name
                : order?.orderInfo?.state?.system_name;

        switch (true) {
            case orderStateConstants.ORDERED === orderStatus:
                return getTranslation("please_wait") + '...';
            case orderStateConstants.ATTACHED_BY_AGENT === orderStatus:
                return getTranslation("agent_is_coming") + '...';
            case orderStateConstants.WORKING === orderStatus:
                return getTranslation("you_are_on_your_way");
            case orderStateConstants.AGENT_WAITING === orderStatus:
                return getTranslation("agent_is_waiting");
            default :
                return ''
        }
    }

    componentDidMount() {
        if (this.props.user) {
            this.props.getUserInfo(this.props.user.data.data.id);
            this.props.getCreditCards();
        }
        if (localStorage.getItem('order_id')) {
            this.props.getOrderInfo(localStorage.getItem('order_id'))
        }
        this.requestAgentLocation = setInterval(() => {
            if (localStorage.getItem('order_id')) {
                this.props.getOrderInfo(localStorage.getItem('order_id'))
            } else {
                this.setState({agentLocation: {}, message: ''})
            }
        }, 5000)
        window.addEventListener('resize', () => this.updateDimensions());
        navigator.geolocation.getCurrentPosition((position) => {
            this.setState({
                location: {
                    ...this.state.location,
                    lng: +position.coords.longitude,
                    lat: +position.coords.latitude
                }
            })
            mapService.getAddressFromLatLng(+position.coords.latitude, +position.coords.longitude).then(
                response => {
                    const address = response.results[0].formatted_address;
                    this.setState({address});
                },
                error => {
                    console.error('error', error);
                }
            );
        }, (e) => {
        }, {timeout: 10});
    }

    componentWillUnmount() {
        clearInterval(this.requestAgentLocation);
        window.removeEventListener('resize', () => this.updateDimensions());
    }

    updateDimensions() {
        this.setState({width: window.innerWidth, height: window.innerHeight});

    };

    onSubmit = () => {
        const {order} = this.props;

        const cancelCases = [orderStateConstants.ORDERED, orderStateConstants.ATTACHED_BY_AGENT];

        const orderStatus = order?.orderInfo && order.orderInfo?.order_state
            ? order.orderInfo?.order_state.system_name
            : order?.orderInfo && order.orderInfo.length
                ? order.orderInfo[0]?.order_state.system_name
                : order?.orderInfo?.state?.system_name;

        if (!this.props.user) {
            return history.push('/login');
        }

        if (cancelCases.includes(orderStatus)) {
            this.props.cancelOrder({order_id: localStorage.getItem('order_id')})
            this.setState({destAddress: '', destLocation: null})
        } else if (this.state.location) {
            const orderBody = {
                longitude: this.state.location.lng,
                latitude: this.state.location.lat,
                customer_id: this.props.user.data.data.id,
                hobbies: this.state.skills,
                address: this.state.address,
                payment_type_id: this.state.cash ? 1 : 2,
            };
            if (!this.state.cash) {
                orderBody['credit_card_id'] = this.state.selectedCard;
            }
            if (this.state.destLocation && Object.keys(this.state.destLocation).length > 1) {
                orderBody['destLongitude'] = this.state.destLocation.lng;
                orderBody['destLatitude'] = this.state.destLocation.lat;
                orderBody['destAddress'] = this.state.destAddress;
            }
            this.props.createOrder(orderBody);
        }
    };

    changePaymentMethod(event) {
        if (event.target.value === 'credit') {
            if (!this.props.user) {
                return history.push('/login');
            }
            this.setState({cash: false})
        } else {
            this.setState({
                cash: true,
                selectedCard: null,
                openAddCard: false,
                cardInfo: {

                    cardNumber: '',
                    expiry_month: '',
                    expiry_year: '',
                    cvc: '',
                    name: '',
                    focus: ''
                }
            })
        }
    }

    render() {
        const {user, loggingIn, order, cards, loadingCreditCard} = this.props;
        const {cash, cardInfo} = this.state;
        const hideDestLocation = [orderStateConstants.AGENT_WAITING, orderStateConstants.ORDERED, orderStateConstants.ATTACHED_BY_AGENT, orderStateConstants.COMPLETE, orderStateConstants.CANCELED,];
        const showAgentCases = [orderStateConstants.WORKING, orderStateConstants.AGENT_WAITING, orderStateConstants.ATTACHED_BY_AGENT];
        const requestCases = [orderStateConstants.WORKING, orderStateConstants.AGENT_WAITING, orderStateConstants.ORDERED, orderStateConstants.ATTACHED_BY_AGENT];
        const endCases = [orderStateConstants.CANCELED, orderStateConstants.COMPLETE];
        const orderStatus = order?.orderInfo && order.orderInfo?.order_state
            ? order.orderInfo?.order_state.system_name
            : order?.orderInfo && order.orderInfo.length
                ? order.orderInfo[0]?.order_state.system_name
                : order?.orderInfo?.state?.system_name;
        return (
            <div className={'container-fluid pl-0 pr-0 mr-0'}
                 style={{
                     flexDirection: 'column',
                     alignItems: 'center',
                     display: 'flex',
                     backgroundColor: '#000000',
                     height: '100%'
                 }}>
                <div className="col-xl-8 col-lg-10 col-md-12 col-xs-12"
                     style={{flexDirection: 'column', maxHeight: 56}}>
                    <Header userEmail={user?.data?.data?.email} logout={this.props.logout}/>
                </div>
                <div className="row justify-content-md-center mr-0 ml-0"
                     style={{
                         position: 'relative',
                         minWidth: '100%',
                         height: 'auto',
                         minHeight: '450px',
                         backgroundPosition: '0 0',
                         backgroundImage: "url(" + about_us + ")",
                         backgroundSize: '100%',
                     }}>
                    {/*<img src={city} style={{objectFit: 'cover', width: '100%'}}/>*/}
                    <div className="col-12 col-xl-10 riding-card"
                         style={{backgroundColor: 'white', alignSelf: 'center'}}>
                        <div className="row justify-content-md-center mr-0 ml-0" style={{height: '100%'}}>
                            <div className="col-xl-6 col-12" style={{marginTop: 50}}>
                                <h1>{getTranslation("request_ride_now")}</h1>
                                <div style={{position: 'relative'}}>
                                    {orderStatus && !endCases.includes(orderStatus) ? (
                                        <h5>{getTranslation("selected_payment_method")}:
                                            {cash ? getTranslation("cash") : cardInfo.cardNumber || cardInfo.number}</h5>
                                    ) : ''}
                                    {!orderStatus || endCases.includes(orderStatus) ? (
                                        <React.Fragment>
                                            <div onChange={this.changePaymentMethod.bind(this)} className="col-12"
                                                 style={{display: 'flex'}}>
                                                <h5>{getTranslation("choose_your_payment_method")}: </h5>
                                                <input type="radio" value="cash" name="payment" className="m-2"
                                                       checked={cash}/>
                                                <p>{getTranslation("cash")}</p>
                                                <input type="radio" value="credit" name="payment" className="m-2"
                                                       checked={!cash}/>
                                                <p>{getTranslation("credit_card")}</p>
                                            </div>
                                            {loadingCreditCard ?
                                                <div style={{display: 'flex', justifyContent: 'center'}}>
                                                    <BeatLoader color="black" loading={loadingCreditCard} size={25}/>
                                                </div>
                                                : !cash ?
                                                    <div style={{padding: 10, display: 'flex', flexDirection: 'column'}}>
                                                        {
                                                            cards && cards.map(card =>
                                                                <div key={card.id} style={{
                                                                    cursor: 'pointer',
                                                                    border: this.state.selectedCard === card.id ? '3px solid green' : '1px solid black',
                                                                    marginBottom: 10
                                                                }}
                                                                     onClick={() => this.setState({selectedCard: card.id})}>
                                                                    <CreditCardInput
                                                                        cardNumberInputProps={{
                                                                            value: card.number,
                                                                            readOnly: true
                                                                        }}
                                                                        cardExpiryInputProps={{
                                                                            value: (card.expiry_month.toString().length > 1 ? card.expiry_month.toString() : '0' + card.expiry_month.toString()) + '/' + card.expiry_year.toString().slice(-2),
                                                                            readOnly: true
                                                                        }}
                                                                        cardCVCInputRenderer={({props}) => (
                                                                            <div style={{cursor: 'pointer'}}
                                                                                 onClick={() => {
                                                                                     this.props.deleteCard(card.id);
                                                                                     this.setState({selectedCard: null});
                                                                                 }}
                                                                            >
                                                                                <AiFillCloseCircle size={25}/>
                                                                            </div>
                                                                        )}
                                                                        containerStyle={{width: '100%'}}
                                                                        fieldStyle={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between'
                                                                        }}
                                                                        fieldClassName="input"
                                                                        customTextLabels={{
                                                                            invalidCardNumber: ' ',
                                                                            expiryError: {
                                                                                invalidExpiryDate: ' ',
                                                                                monthOutOfRange: ' ',
                                                                                yearOutOfRange: ' ',
                                                                                dateOutOfRange: ' '
                                                                            },
                                                                            invalidCvc: ' ',
                                                                            invalidZipCode: ' ',
                                                                            cardNumberPlaceholder: ' ',
                                                                            expiryPlaceholder: ' ',
                                                                            cvcPlaceholder: ' ',
                                                                            zipPlaceholder: ' '
                                                                        }}
                                                                    />
                                                                </div>
                                                            )
                                                        }
                                                        <div style={{cursor: 'pointer', alignSelf: 'center'}}
                                                             onClick={() => this.setState({openAddCard: true})}>
                                                            <IoIosAddCircleOutline size={25}/>
                                                        </div>
                                                        {
                                                            this.state.openAddCard &&
                                                            <div id="PaymentForm" style={{
                                                                marginTop: 10,
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                padding: 10,
                                                                border: '1px solid black',
                                                            }}>
                                                                <div style={{alignSelf: 'flex-end', cursor: 'pointer'}}
                                                                     onClick={() => this.setState({openAddCard: false})}>
                                                                    <AiFillCloseCircle size={25}/></div>
                                                                <CreditCardInput
                                                                    cardNumberInputProps={{
                                                                        name: 'cardNumber',
                                                                        value: cardInfo.cardNumber,
                                                                        onChange: this.handleChangeCardInfo,
                                                                        placeholder: getTranslation('card_number')
                                                                    }}
                                                                    cardExpiryInputProps={{
                                                                        name: 'expiry',
                                                                        value: cardInfo.expiry,
                                                                        onChange: this.handleChangeCardInfo,
                                                                        placeholder: getTranslation('expiry')
                                                                    }}
                                                                    cardCVCInputProps={{
                                                                        name: 'cvc',
                                                                        value: cardInfo.cvc,
                                                                        onChange: this.handleChangeCardInfo,
                                                                        placeholder: getTranslation('cvc')
                                                                    }}
                                                                    containerStyle={{width: '100%'}}
                                                                    // dangerTextStyle={{display: 'none'}}
                                                                    // invalidStyle={{display: 'none'}}
                                                                    fieldStyle={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between'
                                                                    }}
                                                                    fieldClassName="input"
                                                                />
                                                                <div style={{width: '100%'}}
                                                                     className="row justify-content-center ml-0 mr-0">
                                                                    <input type="text"
                                                                           placeholder={getTranslation("credit_cardholder_name")}
                                                                           className="col-xl-10 col-lg-10 col-md-10 col-sm-12 col-12"
                                                                           style={{
                                                                               marginTop: 10,
                                                                               paddingLeft: 20,
                                                                               height: 50,
                                                                               fontSize: 16,
                                                                               backgroundColor: '#F6F6F6',
                                                                               borderWidth: 0
                                                                           }}
                                                                           value={cardInfo.name} name="name"
                                                                           onFocus={this.handleInputFocus}
                                                                           onChange={this.handleChangeCardName}
                                                                    />
                                                                </div>
                                                                <div className="row justify-content-center ml-0 mr-0"
                                                                     style={{padding: '10px 0'}}>
                                                                    <button
                                                                        type="button"
                                                                        className="col-xl-6 col-lg-6 col-md-6 col-sm-6 col-12 "
                                                                        // disabled={!this.renderButtonText()}
                                                                        style={{
                                                                            backgroundColor: 'black',
                                                                            color: 'white',
                                                                            width: '100%',
                                                                            height: 50
                                                                        }}
                                                                        onClick={() => {
                                                                            if (cardInfo.cardNumber && cardInfo.expiry && cardInfo.cvc && cardInfo.name) {
                                                                                this.props.createCard({
                                                                                    customer_id: user.data.data.id,
                                                                                    first_name: cardInfo.name.split(' ')[0],
                                                                                    last_name: cardInfo.name.split(' ')[1],
                                                                                    number: cardInfo.cardNumber,
                                                                                    expiry_month: cardInfo.expiry.split('/')[0],
                                                                                    expiry_year: cardInfo.expiry.split('/')[1],
                                                                                    cvv: cardInfo.cvc,
                                                                                    email: user?.data?.data?.email
                                                                                })
                                                                                this.setState({
                                                                                    cardInfo: {
                                                                                        cardNumber: '',
                                                                                        expiry: '',
                                                                                        cvc: '',
                                                                                        name: '',
                                                                                        focus: ''
                                                                                    }, openAddCard: false
                                                                                })
                                                                            }
                                                                        }}>
                                                                        {getTranslation("submit")}
                                                                    </button>
                                                                </div>
                                                                {/*</form>*/}
                                                            </div>
                                                        }
                                                    </div>
                                                    : null
                                            }
                                        </React.Fragment>
                                    ) : ''}
                                    <LocationSearchInput disable={requestCases.includes(orderStatus)}
                                                         address={this.state.address}
                                                         placeholder={getTranslation("pick_up_location") + "..."}
                                                         getLocation={(value) => {
                                                             this.setState({
                                                                 address: value.address,
                                                                 location: {
                                                                     ...this.state.location,
                                                                     lng: value.LatLng.lng,
                                                                     lat: value.LatLng.lat
                                                                 }
                                                             })
                                                         }}/>
                                    <LocationSearchInput disable={requestCases.includes(orderStatus)}
                                                         placeholder={getTranslation("drop_location") + "..."}
                                                         address={this.state.destAddress}
                                                         getLocation={(value) => {
                                                             this.props.getOrderEstimatedValue({
                                                                 startLocation: {
                                                                     lat: this.state.location.lat,
                                                                     lng: this.state.location.lng,
                                                                 },
                                                                 endLocation: {
                                                                     lat: value.LatLng.lat,
                                                                     lng: value.LatLng.lng,
                                                                 }
                                                             })
                                                             this.setState({
                                                                 destAddress: value.address,
                                                                 destLocation: {
                                                                     ...this.state.destLocation,
                                                                     lng: value.LatLng.lng,
                                                                     lat: value.LatLng.lat,
                                                                     marked: true
                                                                 }
                                                             })
                                                         }}/>

                                    {this.renderButtonText() !== 'hide' &&
                                    <div className="row" style={{paddingBottom: 50, margin: '10px 0 ',}}>
                                        <div className="col-xl-6 col-lg-6 col-md-6 col-sm-6 col-12 "
                                             style={{padding: '10px 0'}}>
                                            <button
                                                disabled={!this.renderButtonText()}
                                                style={{
                                                    backgroundColor: 'black',
                                                    color: 'white',
                                                    width: '100%',
                                                    height: 50
                                                }}
                                                onClick={this.onSubmit}>
                                                {this.renderButtonText() || getTranslation("loading") + '...'}
                                            </button>
                                        </div>
                                        {this.state.destLocation?.lat && this.state.destLocation.lng &&
                                        <div className="col-xl-6 col-lg-6 col-md-6 col-sm-6 col-12 "
                                             style={{padding: '10px 0', textAlign: 'center'}}>
                                            <p>{getTranslation("distance")} : {this.state.distance}Km</p>
                                            <p>{getTranslation("price")} : {this.state.price}</p>
                                        </div>}
                                    </div>}

                                    <p>{this.renderMessageText()}</p>
                                    {loggingIn ?
                                        <img
                                            src="data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA=="/>
                                        : ''
                                    }
                                </div>
                            </div>
                            <div className=" col-xl-6 col-12 pl-0 pr-0"
                                 style={{textAlign: 'center', marginTop: '1%', marginBottom: '1%'}}>
                                <MapSection
                                    location={{
                                        ...this.state.location,
                                        marked: orderStatus !== orderStateConstants.WORKING
                                    }}
                                    zoomLevel={17}
                                    destLocation={{
                                        ...this.state.destLocation,
                                    }}
                                    locations={order && order.orderInfo && order?.orderInfo[0]?.locations || []}
                                    ordered={order.orderInfo && order.orderInfo.length}
                                    agentLocation={showAgentCases.includes(orderStatus) && this.state.agentLocation}
                                    changeLocation={(value) => {
                                        this.setState({
                                            location: {
                                                ...this.state.location,
                                                lng: value.lng,
                                                lat: value.lat
                                            }
                                        })
                                        mapService.getAddressFromLatLng(value.lat, value.lng).then(
                                            response => {
                                                const address = response.results[0].formatted_address;
                                                this.setState({address});
                                            },
                                            error => {
                                                console.error(error);
                                            }
                                        );
                                    }}/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

function mapState(state) {
    const {authentication, order, lang} = state;
    const usersInfo = state.user;
    const {cards, loadingCreditCard} = usersInfo;
    const {user, loggingIn} = authentication;
    return {user, loggingIn, order, cards, loadingCreditCard};
}

const actionCreators = {
    getUsers: userActions.getAll,
    getUserInfo: userActions.getUserInfo,
    createOrder: orderAction.order,
    cancelOrder: orderAction.cancelOrder,
    logout: userActions.logout,
    getCreditCards: userActions.getCreditCards,
    createCard: userActions.createCard,
    deleteCard: userActions.deleteCard,
    getOrderInfo: orderAction.getOrderInfo,
    getOrderEstimatedValue: orderAction.getOrderEstimatedValue
}

const connectedHomePage = connect(mapState, actionCreators)(HomePage);
export {connectedHomePage as HomePage};
