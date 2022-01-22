import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../core/button/Button';
import Accordion from '../core/accordion/Accordion';
import { NavbarLink } from '../core/navbar/Navbar';
import { AppRoutes } from '../../config';
import { scrollToElement } from '../../utils';
import { IAppRouteKey, IFAQData, ITranslations, T } from '../../types';
import { ReactComponent as Android } from '../../assets/image/svg/android.svg';
import { ReactComponent as Ios } from '../../assets/image/svg/ios.svg';
import Doctor from '../../assets/image/svg/doctor.svg';
import Bundles from '../../assets/image/svg/bundles.svg';
import Services from '../../assets/image/svg/services.svg';
import OnlinePharmacy from '../../assets/image/svg/online-pharmacy.svg';
import PhonesIcon from '../../assets/image/svg/phones-icon.svg';
import QRCode from '../../assets/image/svg/QR.svg';
import { ReactComponent as MoveToTop } from '../../assets/image/svg/move-to-top.svg';
import { registerDOMListener, unregisterDOMListener } from '../../utils/DOM/registerDOMListener';

export interface IDashboardProps {
  t: ITranslations;
  faq: IFAQData[];
  loadFAQ: () => void;
}

export interface IDashboardState {
  showMoveToUpButton: boolean;
}

const SCROLL_TOP = 30;

export default class Dashboard extends React.Component<IDashboardProps, IDashboardState> {
  private dashboardScrollListenerId = '';

  constructor(props: IDashboardProps) {
    super(props);
    this.state = {
      showMoveToUpButton: false,
    };
  }

  componentDidMount() {
    this.dashboardScrollListenerId = registerDOMListener('scroll', (event) => this.toggleMoveToUpButton(event));
    this.props.loadFAQ();
  }

  componentWillUnmount(): void {
    unregisterDOMListener(this.dashboardScrollListenerId);
  }

  handleDownloadAndroid = () => {
    console.log('Download Android Clicked');
  };

  handleDownloadIos = () => {
    console.log('Download IOS Clicked');
  };

  toggleMoveToUpButton(event: any): void {
    if (event.path[0].scrollingElement.scrollTop > SCROLL_TOP && !this.state.showMoveToUpButton) {
      return this.setState({ showMoveToUpButton: true });
    }
    if (event.path[0].scrollingElement.scrollTop < SCROLL_TOP && this.state.showMoveToUpButton) {
      return this.setState({ showMoveToUpButton: false });
    }
  }

  moveToTop(): void {
    scrollToElement(NavbarLink.HEADER);
  }

  render(): React.ReactNode {
    const { t, faq } = this.props;
    const { showMoveToUpButton } = this.state;

    return (
      <div className="dashboard">
        <div className={`move-to-top${showMoveToUpButton ? ' visible' : ''}`} onClick={this.moveToTop.bind(this)}>
          <MoveToTop />
        </div>
        <div className="intro">
          <div className="intro-main">
            <div className="left-side">
              <p className="intro-text">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod or incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
                dolor in repre
              </p>
              <div className="download-buttons">
                <Button
                  handleClick={this.handleDownloadIos}
                  icon={
                    <div className="download-button-icon">
                      <img src={QRCode} alt="" />
                      <Ios />
                    </div>
                  }
                  className="blue"
                >
                  <label className="multiline-text ios">
                    <span className="small">{t[T.DOWNLOAD_IOS_SUB]}</span>
                    <span className="big">{t[T.DOWNLOAD_IOS]}</span>
                  </label>
                </Button>

                <Button
                  handleClick={this.handleDownloadAndroid}
                  icon={
                    <div className="download-button-icon">
                      <img src={QRCode} alt="" />
                      <Android />
                    </div>
                  }
                  className="blue"
                >
                  <label className="multiline-text android">
                    <span className="small">{t[T.DOWNLOAD_ANDROID_SUB]}</span>
                    <span className="big">{t[T.DOWNLOAD_ANDROID]}</span>
                  </label>
                </Button>
              </div>
            </div>
            <div className="right-side">
              <img src={Doctor} className="doctor" alt={t[T.DOCTOR_IMG_ALT]} />
            </div>
          </div>
          <p className="intro-text-footer">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
            enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
            in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          </p>
        </div>
        <div className="bundles" id={NavbarLink.BUNDLES}>
          <Link className="section-title" to={AppRoutes[IAppRouteKey.BUNDLES].path}>
            {t[T.BUNDLES]}
          </Link>
          <div className="card">
            <div className="image">
              <Link to={AppRoutes[IAppRouteKey.BUNDLES].path}>
                <img src={Bundles} alt={t[T.BUNDLES_IMG_ALT]} />
              </Link>
            </div>
            <div className="info">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmodempor incididunt ut labore et dolore magna liqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
                dolor in reprehenderit in voluptate velit esse cillum.
              </p>
            </div>
          </div>
        </div>
        <div className="services" id={AppRoutes[IAppRouteKey.SERVICES].path}>
          <Link className="section-title" to={AppRoutes[IAppRouteKey.SERVICES].path}>
            {t[T.SERVICE]}
          </Link>
          <div className="card reversed">
            <div className="image">
              <Link to={AppRoutes[IAppRouteKey.SERVICES].path}>
                <img src={Services} alt={t[T.SERVICES_IMG_ALT]} />
              </Link>
            </div>
            <div className="info">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmodempor incididunt ut labore et dolore magna liqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
                dolor in reprehenderit in voluptate velit esse cillum.
              </p>
            </div>
          </div>
        </div>
        <div className="online-pharmacy" id={NavbarLink.ONLINE_PHARMACY}>
          <Link to="not-found" className="section-title">
            {t[T.ONLINE_PHARMACY]}
          </Link>
          <div className="card">
            <div className="image">
              <Link to="not-found">
                <img src={OnlinePharmacy} alt={t[T.ONLINE_PHARMACY_IMG_ALT]} />
              </Link>
            </div>
            <div className="info">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmodempor incididunt ut labore et dolore magna liqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
                dolor in reprehenderit in voluptate velit esse cillum.
              </p>
            </div>
          </div>
        </div>
        <div className="help" id={NavbarLink.HELP}>
          <label className="section-title">{t[T.FREQUENTLY_ASKED_QUESTIONS]}</label>
          <Accordion data={faq} />
          <div className="help-main">
            <div className="left-side">
              <p className="help-text">{t[T.DOWNLOAD_APP_FOR]}</p>
              <p className="help-text">{t[T.DOWNLOAD_APP_FOR] && t[T.IPHONE_AND_ANDROID]}</p>
              <div className="download-buttons">
                <Button
                  handleClick={this.handleDownloadIos}
                  icon={
                    <div className="download-button-icon">
                      <img src={QRCode} alt="" />
                      <Ios />
                    </div>
                  }
                  className="blue"
                >
                  <label className="multiline-text ios">
                    <span className="small">{t[T.DOWNLOAD_IOS_SUB]}</span>
                    <span className="big">{t[T.DOWNLOAD_IOS]}</span>
                  </label>
                </Button>

                <Button
                  handleClick={this.handleDownloadAndroid}
                  icon={
                    <div className="download-button-icon">
                      <img src={QRCode} alt="" />
                      <Android />
                    </div>
                  }
                  className="blue"
                >
                  <label className="multiline-text android">
                    <span className="small">{t[T.DOWNLOAD_ANDROID_SUB]}</span>
                    <span className="big">{t[T.DOWNLOAD_ANDROID]}</span>
                  </label>
                </Button>
              </div>
            </div>

            <div className="right-side">
              <img src={PhonesIcon} alt="" />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
